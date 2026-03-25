import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState
} from 'react'
import { createSeedState } from './seed.js'
import { uid } from '../utils/id.js'
import { useAuth } from './auth.jsx'
import { db } from '../firebase/client.js'
import { SPECIES_LIST, SPECIES_PRESETS } from '../utils/speciesDefaults.js'
import {
  derivePhaseFromMeasurement,
  getDefaultHarvestWindows,
  getLatestMeasurementLog,
  getMeasuredFlushMm
} from '../utils/growthPhases.js'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore'

const StoreContext = createContext(null)

const initialState = createSeedState()

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_GROW': {
      const now = new Date().toISOString()
      const newGrow = {
        ...action.payload,
        id: uid('grow'),
        status: 'active',
        createdAt: now,
        updatedAt: now
      }
      return {
        ...state,
        grows: [newGrow, ...state.grows]
      }
    }
    case 'UPDATE_GROW': {
      const { id, updates } = action.payload
      return {
        ...state,
        grows: state.grows.map((grow) =>
          grow.id === id
            ? {
                ...grow,
                ...updates,
                updatedAt: new Date().toISOString()
              }
            : grow
        )
      }
    }
    case 'DELETE_GROW': {
      const id = action.payload
      return {
        ...state,
        grows: state.grows.filter((grow) => grow.id !== id),
        logs: state.logs.filter((log) => log.growId !== id),
        events: state.events.filter((event) => event.growId !== id),
        harvests: state.harvests.filter((harvest) => harvest.growId !== id)
      }
    }
    case 'DUPLICATE_GROW': {
      const original = state.grows.find((grow) => grow.id === action.payload)
      if (!original) return state
      const now = new Date().toISOString()
      const clone = {
        ...original,
        id: uid('grow'),
        name: `${original.name} (Copy)`,
        status: 'active',
        startDate: now,
        phase: 'Incubation',
        createdAt: now,
        updatedAt: now
      }
      return {
        ...state,
        grows: [clone, ...state.grows]
      }
    }
    case 'COMPLETE_GROW': {
      const id = action.payload
      return {
        ...state,
        grows: state.grows.map((grow) =>
          grow.id === id
            ? {
                ...grow,
                status: 'complete',
                phase: 'Post-harvest',
                updatedAt: new Date().toISOString()
              }
            : grow
        )
      }
    }
    case 'UNARCHIVE_GROW': {
      const id = action.payload
      return {
        ...state,
        grows: state.grows.map((grow) =>
          grow.id === id
            ? {
                ...grow,
                status: 'active',
                phase: grow.phase === 'Post-harvest' ? 'Fruiting' : grow.phase,
                updatedAt: new Date().toISOString()
              }
            : grow
        )
      }
    }
    case 'ADD_LOG': {
      const now = new Date().toISOString()
      const newLog = {
        ...action.payload,
        id: action.payload.id || uid('log'),
        createdAt: now
      }
      return {
        ...state,
        logs: [newLog, ...state.logs]
      }
    }
    case 'UPDATE_LOG': {
      const { id, updates } = action.payload
      return {
        ...state,
        logs: state.logs.map((log) => (log.id === id ? { ...log, ...updates } : log))
      }
    }
    case 'ADD_EVENT': {
      const newEvent = {
        ...action.payload,
        id: uid('event')
      }
      return {
        ...state,
        events: [newEvent, ...state.events]
      }
    }
    case 'ADD_HARVEST': {
      const newHarvest = {
        ...action.payload,
        id: action.payload.id || uid('harvest')
      }
      return {
        ...state,
        harvests: [newHarvest, ...state.harvests]
      }
    }
    case 'UPDATE_HARVEST': {
      const { id, updates } = action.payload
      return {
        ...state,
        harvests: state.harvests.map((harvest) =>
          harvest.id === id ? { ...harvest, ...updates } : harvest
        )
      }
    }
    case 'UPDATE_SETTINGS': {
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      }
    }
    case 'SET_GROWS':
      return { ...state, grows: action.payload }
    case 'SET_LOGS':
      return { ...state, logs: action.payload }
    case 'SET_EVENTS':
      return { ...state, events: action.payload }
    case 'SET_HARVESTS':
      return { ...state, harvests: action.payload }
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }
    case 'IMPORT_STATE':
      return action.payload
    default:
      return state
  }
}

function mapDocs(snapshot) {
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
}

function mergePresetDefaults(currentPresets = {}) {
  const merged = {}
  Object.entries({ ...SPECIES_PRESETS, ...currentPresets }).forEach(([species, preset]) => {
    merged[species] = {
      ...(SPECIES_PRESETS[species] || {}),
      ...(preset || {}),
      phaseThresholds: {
        ...(SPECIES_PRESETS[species]?.phaseThresholds || {}),
        ...(preset?.phaseThresholds || {})
      },
      harvestWindow: {
        ...(SPECIES_PRESETS[species]?.harvestWindow || {}),
        ...(preset?.harvestWindow || {})
      }
    }
  })
  return merged
}

function settingsRef(userId) {
  return doc(db, 'users', userId, 'settings', 'profile')
}

async function seedFirestore(userId, seedState) {
  const batch = writeBatch(db)
  seedState.grows.forEach((grow) => {
    batch.set(doc(db, 'users', userId, 'grows', grow.id), grow)
  })
  seedState.logs.forEach((log) => {
    batch.set(doc(db, 'users', userId, 'logs', log.id), log)
  })
  seedState.events.forEach((event) => {
    batch.set(doc(db, 'users', userId, 'events', event.id), event)
  })
  seedState.harvests.forEach((harvest) => {
    batch.set(doc(db, 'users', userId, 'harvests', harvest.id), harvest)
  })
  batch.set(settingsRef(userId), seedState.settings)
  await batch.commit()
}

async function ensureSettings(userId, settings) {
  const ref = settingsRef(userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, settings)
    return
  }
  const data = snap.data() || {}
  const updates = {}
  const currentSpecies = Array.isArray(data.speciesList) ? data.speciesList : []
  const mergedSpecies = Array.from(new Set([...SPECIES_LIST, ...currentSpecies])).sort()
  if (!currentSpecies.length || currentSpecies.length !== mergedSpecies.length) {
    updates.speciesList = mergedSpecies
  }
  if (!data.defaultTargets) {
    updates.defaultTargets = settings.defaultTargets || {}
  }
  if (!data.healthWeights) {
    updates.healthWeights = settings.healthWeights || {}
  }
  if (!data.uiPreferences) {
    updates.uiPreferences = settings.uiPreferences || {}
  }
  const currentHarvestWindows = data.harvestWindows || {}
  const mergedHarvestWindows = {
    ...getDefaultHarvestWindows(),
    ...currentHarvestWindows
  }
  const missingHarvestWindow = Object.keys(getDefaultHarvestWindows()).some(
    (key) => currentHarvestWindows[key] == null
  )
  if (!data.harvestWindows || missingHarvestWindow) {
    updates.harvestWindows = mergedHarvestWindows
  }
  const currentPresets = data.presets || {}
  const mergedPresets = mergePresetDefaults(currentPresets)
  const missingPreset = Object.keys(SPECIES_PRESETS).some((key) => {
    const current = currentPresets[key]
    const base = SPECIES_PRESETS[key]
    return (
      current == null ||
      !current.phaseThresholds ||
      (base.harvestWindow && !current.harvestWindow)
    )
  })
  if (missingPreset) {
    updates.presets = mergedPresets
  }
  if (Object.keys(updates).length) {
    await setDoc(ref, updates, { merge: true })
  }
}

async function clearCollection(userId, name) {
  const ref = collection(db, 'users', userId, name)
  const snap = await getDocs(ref)
  let batch = writeBatch(db)
  let count = 0
  for (const docSnap of snap.docs) {
    batch.delete(docSnap.ref)
    count += 1
    if (count >= 450) {
      await batch.commit()
      batch = writeBatch(db)
      count = 0
    }
  }
  if (count) {
    await batch.commit()
  }
}

function getGrowPreset(grow, presets = {}) {
  return presets?.[grow?.species] || SPECIES_PRESETS[grow?.species] || null
}

function getAutoPhaseUpdates(grow, logs, presets = {}, nextLog = null, replacedLogId = null) {
  if (!grow || grow.status === 'complete') return null
  const nextLogs = logs.filter((log) => log.growId === grow.id && log.id !== replacedLogId)
  if (nextLog) nextLogs.push(nextLog)
  const latestMeasuredLog = getLatestMeasurementLog(nextLogs, grow.id)
  const measuredMm = getMeasuredFlushMm(latestMeasuredLog)
  const preset = getGrowPreset(grow, presets)
  const phase = derivePhaseFromMeasurement(
    measuredMm,
    grow.phaseThresholds || preset?.phaseThresholds
  )
  if (!phase || phase === grow.phase) return null
  return { phase, updatedAt: new Date().toISOString() }
}

async function deleteByGrowId(userId, name, growId) {
  const ref = collection(db, 'users', userId, name)
  const snap = await getDocs(query(ref, where('growId', '==', growId)))
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.forEach((docSnap) => batch.delete(docSnap.ref))
  await batch.commit()
}

export function StoreProvider({ children }) {
  const { user } = useAuth()
  const [hydrated, setHydrated] = useState(false)
  const subscriptions = useRef([])
  const phaseSyncRef = useRef(new Set())

  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    subscriptions.current.forEach((unsub) => unsub())
    subscriptions.current = []

    if (!user) {
      setHydrated(true)
      return
    }

    let cancelled = false

    const init = async () => {
      setHydrated(false)
      const seed = createSeedState()
      try {
        const growsRef = collection(db, 'users', user.uid, 'grows')
        const growSnap = await getDocs(query(growsRef, limit(1)))
        if (growSnap.empty) {
          await seedFirestore(user.uid, seed)
        } else {
          await ensureSettings(user.uid, seed.settings)
        }

        if (cancelled) return

        subscriptions.current = [
          onSnapshot(collection(db, 'users', user.uid, 'grows'), (snap) =>
            dispatch({ type: 'SET_GROWS', payload: mapDocs(snap) })
          ),
          onSnapshot(collection(db, 'users', user.uid, 'logs'), (snap) =>
            dispatch({ type: 'SET_LOGS', payload: mapDocs(snap) })
          ),
          onSnapshot(collection(db, 'users', user.uid, 'events'), (snap) =>
            dispatch({ type: 'SET_EVENTS', payload: mapDocs(snap) })
          ),
          onSnapshot(collection(db, 'users', user.uid, 'harvests'), (snap) =>
            dispatch({ type: 'SET_HARVESTS', payload: mapDocs(snap) })
          ),
          onSnapshot(settingsRef(user.uid), (snap) => {
            if (snap.exists()) {
              dispatch({ type: 'SET_SETTINGS', payload: snap.data() })
            }
          })
        ]
      } catch (error) {
        console.error('Failed to initialize Firebase data', error)
      } finally {
        if (!cancelled) setHydrated(true)
      }
    }

    init()

    return () => {
      cancelled = true
      subscriptions.current.forEach((unsub) => unsub())
      subscriptions.current = []
    }
  }, [user])

  useEffect(() => {
    if (!user || !hydrated) return

    state.grows.forEach((grow) => {
      if (grow.status === 'complete' || phaseSyncRef.current.has(grow.id)) return
      const phaseUpdates = getAutoPhaseUpdates(grow, state.logs, state.settings.presets)
      if (!phaseUpdates) return
      phaseSyncRef.current.add(grow.id)
      updateDoc(doc(db, 'users', user.uid, 'grows', grow.id), phaseUpdates)
        .catch((error) => {
          console.error('Failed to sync grow phase', error)
        })
        .finally(() => {
          phaseSyncRef.current.delete(grow.id)
        })
    })
  }, [user, hydrated, state.grows, state.logs, state.settings.presets])

  const actions = useMemo(
    () => ({
      addGrow: async (payload) => {
        if (!user) {
          dispatch({ type: 'ADD_GROW', payload })
          return
        }
        const now = new Date().toISOString()
        const id = uid('grow')
        const grow = { ...payload, id, status: 'active', createdAt: now, updatedAt: now }
        await setDoc(doc(db, 'users', user.uid, 'grows', id), grow)
      },
      updateGrow: async (id, updates) => {
        if (!user) {
          dispatch({ type: 'UPDATE_GROW', payload: { id, updates } })
          return
        }
        await updateDoc(doc(db, 'users', user.uid, 'grows', id), {
          ...updates,
          updatedAt: new Date().toISOString()
        })
      },
      deleteGrow: async (id) => {
        if (!user) {
          dispatch({ type: 'DELETE_GROW', payload: id })
          return
        }
        await deleteDoc(doc(db, 'users', user.uid, 'grows', id))
        await deleteByGrowId(user.uid, 'logs', id)
        await deleteByGrowId(user.uid, 'events', id)
        await deleteByGrowId(user.uid, 'harvests', id)
      },
      duplicateGrow: async (id) => {
        if (!user) {
          dispatch({ type: 'DUPLICATE_GROW', payload: id })
          return
        }
        const original = state.grows.find((grow) => grow.id === id)
        if (!original) return
        const now = new Date().toISOString()
        const cloneId = uid('grow')
        const clone = {
          ...original,
          id: cloneId,
          name: `${original.name} (Copy)`,
          status: 'active',
          startDate: now,
          phase: 'Incubation',
          createdAt: now,
          updatedAt: now
        }
        await setDoc(doc(db, 'users', user.uid, 'grows', cloneId), clone)
      },
      completeGrow: async (id) => {
        if (!user) {
          dispatch({ type: 'COMPLETE_GROW', payload: id })
          return
        }
        await updateDoc(doc(db, 'users', user.uid, 'grows', id), {
          status: 'complete',
          phase: 'Post-harvest',
          updatedAt: new Date().toISOString()
        })
      },
      unarchiveGrow: async (id) => {
        const grow = state.grows.find((item) => item.id === id)
        const phaseUpdates = getAutoPhaseUpdates(grow, state.logs, state.settings.presets)
        const nextPhase = phaseUpdates?.phase || (grow?.phase === 'Post-harvest' ? 'Fruiting' : grow?.phase)
        if (!user) {
          dispatch({ type: 'UNARCHIVE_GROW', payload: id })
          if (nextPhase && nextPhase !== grow?.phase) {
            dispatch({ type: 'UPDATE_GROW', payload: { id, updates: { phase: nextPhase } } })
          }
          return
        }
        await updateDoc(doc(db, 'users', user.uid, 'grows', id), {
          status: 'active',
          phase: nextPhase,
          updatedAt: new Date().toISOString()
        })
      },
      addLog: async (payload) => {
        const id = payload.id || uid('log')
        const nextLog = { ...payload, id }
        const grow = state.grows.find((item) => item.id === payload.growId)
        const phaseUpdates = getAutoPhaseUpdates(grow, state.logs, state.settings.presets, nextLog)
        if (!user) {
          dispatch({ type: 'ADD_LOG', payload: nextLog })
          if (phaseUpdates) {
            dispatch({ type: 'UPDATE_GROW', payload: { id: payload.growId, updates: phaseUpdates } })
          }
          return id
        }
        const now = new Date().toISOString()
        await setDoc(doc(db, 'users', user.uid, 'logs', id), {
          ...payload,
          id,
          createdAt: now
        })
        if (phaseUpdates) {
          await updateDoc(doc(db, 'users', user.uid, 'grows', payload.growId), phaseUpdates)
        }
        return id
      },
      updateLog: async (id, updates) => {
        const existingLog = state.logs.find((log) => log.id === id)
        const grow = state.grows.find((item) => item.id === (updates.growId || existingLog?.growId))
        const nextLog = { ...existingLog, ...updates, id }
        const phaseUpdates = getAutoPhaseUpdates(grow, state.logs, state.settings.presets, nextLog, id)
        if (!user) {
          dispatch({ type: 'UPDATE_LOG', payload: { id, updates } })
          if (phaseUpdates) {
            dispatch({
              type: 'UPDATE_GROW',
              payload: { id: nextLog.growId, updates: phaseUpdates }
            })
          }
          return
        }
        await updateDoc(doc(db, 'users', user.uid, 'logs', id), updates)
        if (phaseUpdates) {
          await updateDoc(doc(db, 'users', user.uid, 'grows', nextLog.growId), phaseUpdates)
        }
      },
      addEvent: async (payload) => {
        if (!user) {
          dispatch({ type: 'ADD_EVENT', payload })
          return
        }
        const id = uid('event')
        await setDoc(doc(db, 'users', user.uid, 'events', id), { ...payload, id })
      },
      addHarvest: async (payload) => {
        const id = payload.id || uid('harvest')
        if (!user) {
          dispatch({ type: 'ADD_HARVEST', payload: { ...payload, id } })
          return id
        }
        await setDoc(doc(db, 'users', user.uid, 'harvests', id), { ...payload, id })
        return id
      },
      updateHarvest: async (id, updates) => {
        if (!user) {
          dispatch({ type: 'UPDATE_HARVEST', payload: { id, updates } })
          return
        }
        await updateDoc(doc(db, 'users', user.uid, 'harvests', id), updates)
      },
      updateSettings: async (payload) => {
        if (!user) {
          dispatch({ type: 'UPDATE_SETTINGS', payload })
          return
        }
        await setDoc(settingsRef(user.uid), payload, { merge: true })
      },
      importState: async (payload) => {
        if (!user) {
          dispatch({ type: 'IMPORT_STATE', payload })
          return
        }
        await clearCollection(user.uid, 'grows')
        await clearCollection(user.uid, 'logs')
        await clearCollection(user.uid, 'events')
        await clearCollection(user.uid, 'harvests')
        await seedFirestore(user.uid, payload)
      }
    }),
    [user, state.grows]
  )

  return (
    <StoreContext.Provider value={{ state, actions, hydrated }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used within StoreProvider')
  return context
}
