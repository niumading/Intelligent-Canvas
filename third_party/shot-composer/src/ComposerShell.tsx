import { ComposerViewport, type ComposerViewportAPI, type ComposerMode } from './modules/composer/ComposerViewport';
import SceneTree from './modules/composer/SceneTree';
import Inspector from './modules/composer/Inspector';
import { ShotBuilderPanel } from './modules/composer/ShotBuilderPanel';
import { ShotStrip } from './modules/library/calibration/ShotStrip';
import { describeShot, type ShotLibraryEntry } from './modules/library/calibration/shotLibraryData';
import { getCompositionPreset, DEFAULT_COMPOSITION_PRESET } from './modules/library/calibration/compositionPresets';
import { SHOT_SIZE_OPTIONS, ANGLE_OPTIONS, ELEVATION_OPTIONS } from './modules/library/calibration/shotAxes';
import type { ShotParams } from './modules/library/calibration/shotSolver';
import { useComposerStore, selectCanPose, selectCanComposeShot } from './stores/composerStore';
import type { ShotSegment } from './stores/composerStore';
import { loadPoseLibrary, saveCustomPose } from './modules/composer/helpers/poseLibrary';
import { loadMotionLibrary, isMotionCompatible, saveMotionToLibrary } from './modules/motion/helpers/motionLibrary';
import { saveSceneToLibrary } from './modules/motion/helpers/sceneLibrary';
import { Timeline } from './modules/motion/Timeline';
import { ShotSequenceTimeline } from './modules/motion/ShotSequenceTimeline';
import { sequenceDuration } from './modules/motion/helpers/shotSequence';
import { CameraInspectorPanel } from './modules/motion/CameraInspectorPanel';
import { PoseLibraryPanel } from './modules/motion/PoseLibraryPanel';
import { registerShotAPI, registerViewportAPI, startComposerBridge } from './modules/mcpBridge';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type * as THREE from 'three';
import type { SceneObject } from './stores/composerStore';
import type { CharacterType, PrimitiveType, MotionObjectType } from './stores/composerStore';

type MobileTab = 'scene' | 'viewport' | 'inspector';
type RightTab = 'shot' | 'object' | 'motion';

const DEFAULT_SHOT_PARAMS: ShotParams = {
  shotSize: 'full',
  angle: 'front',
  elevation: 'eye',
  composition: DEFAULT_COMPOSITION_PRESET,
};

/** Reads a Library-originated shot (see ShotLibraryPage's "Preview"/"Add to Scene" links) out of the URL. Unknown/missing values fall back to defaults rather than rejecting the whole link. */
function parseIncomingShot(search: URLSearchParams): { params: ShotParams; addToSequence: boolean } | null {
  const shotSize = search.get('shotSize');
  const angle = search.get('angle');
  const elevation = search.get('elevation');
  const composition = search.get('composition');
  if (!shotSize && !angle && !elevation && !composition) return null;

  return {
    params: {
      shotSize: SHOT_SIZE_OPTIONS.find(([id]) => id === shotSize)?.[0] ?? DEFAULT_SHOT_PARAMS.shotSize,
      angle: ANGLE_OPTIONS.find(([id]) => id === angle)?.[0] ?? DEFAULT_SHOT_PARAMS.angle,
      elevation: ELEVATION_OPTIONS.find(([id]) => id === elevation)?.[0] ?? DEFAULT_SHOT_PARAMS.elevation,
      composition: composition ? getCompositionPreset(composition) : DEFAULT_SHOT_PARAMS.composition,
    },
    addToSequence: search.get('addToSequence') === '1',
  };
}

/** Compact Play/Pause/Stop + scrub bar — deliberately separate from the Shot Combination controls, and small enough to sit directly above the timeline. */
function TransportBar({ playing, elapsed, duration, onPlay, onPause, onStop, onScrub }: {
  playing: boolean;
  elapsed: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onScrub: (t: number) => void;
}) {
  return (
    <div className="transport-bar">
      <div className="transport-bar-buttons">
        <button onClick={onPlay} disabled={playing} title="播放">▶</button>
        <button onClick={onPause} disabled={!playing} title="暂停">⏸</button>
        <button onClick={onStop} title="停止">⏹</button>
      </div>
      <span className="transport-bar-time">{elapsed.toFixed(2)}s / {duration.toFixed(1)}s</span>
      <input
        type="range" min={0} max={duration} step={0.01} value={Math.min(elapsed, duration)}
        onChange={(e) => onScrub(Number(e.target.value))}
        className="transport-bar-scrub"
      />
    </div>
  );
}

function ComposerShell() {
  const objects = useComposerStore(s => s.objects);
  const selectedId = useComposerStore(s => s.selectedObjectId);
  const activeCameraId = useComposerStore(s => s.activeCameraId);
  const setActiveCamera = useComposerStore(s => s.setActiveCamera);
  const activeTool = useComposerStore(s => s.activeTool);
  const setActiveTool = useComposerStore(s => s.setActiveTool);
  const canPose = useComposerStore(selectCanPose);
  const canComposeShot = useComposerStore(selectCanComposeShot);
  const addObject = useComposerStore(s => s.addObject);
  const selectObject = useComposerStore(s => s.selectObject);
  const toggleObjectVisibility = useComposerStore(s => s.toggleObjectVisibility);
  const toggleObjectLock = useComposerStore(s => s.toggleObjectLock);
  const duplicateObject = useComposerStore(s => s.duplicateObject);
  const deleteObject = useComposerStore(s => s.deleteObject);
  const renameObject = useComposerStore(s => s.renameObject);
  const updateObjectTransform = useComposerStore(s => s.updateObjectTransform);
  const objectInstances = useComposerStore(s => s.objectInstances);
  const applyMotionPreset = useComposerStore(s => s.applyMotionPreset);
  const addShotSegment = useComposerStore(s => s.addShotSegment);
  const shotSequence = useComposerStore(s => s.shotSequence);
  const updateShotSegment = useComposerStore(s => s.updateShotSegment);
  const playing = useComposerStore(s => s.playback.playing);
  const elapsed = useComposerStore(s => s.playback.elapsed);
  const speed = useComposerStore(s => s.playback.speed);
  const duration = useComposerStore(s => s.playback.duration);
  const setDuration = useComposerStore(s => s.setDuration);
  const setElapsed = useComposerStore(s => s.setElapsed);
  const setPlaying = useComposerStore(s => s.setPlaying);
  const setSpeed = useComposerStore(s => s.setSpeed);
  const undo = useComposerStore(s => s.undo);
  const redo = useComposerStore(s => s.redo);
  const canUndo = useComposerStore(s => s.history.length > 0);
  const canRedo = useComposerStore(s => s.future.length > 0);
  const clearScene = useComposerStore(s => s.clearScene);

  const viewportRef = useRef<ComposerViewportAPI>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('viewport');
  const [isMobile, setIsMobile] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>('shot');
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<ComposerMode>(
    () => (searchParams.get('mode') === 'motion' || searchParams.get('applyMotion')) ? 'motion' : 'static',
  );
  const [grid, setGrid] = useState(true);
  const [compositionMode, setCompositionMode] = useState(false);

  const [shotParams, setShotParams] = useState<ShotParams>(
    () => parseIncomingShot(searchParams)?.params ?? DEFAULT_SHOT_PARAMS,
  );
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);

  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [mainCamera, setMainCamera] = useState<THREE.Camera | null>(null);
  const [viewportReady, setViewportReady] = useState(false);
  const [sendingToCanvas, setSendingToCanvas] = useState(false);
  const [sendStatus, setSendStatus] = useState('');
  const [sequence, setSequence] = useState<ShotLibraryEntry[]>([]);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Local-first MCP bridge: silently tries to reach a local MCP server (see
  // mcp/README.md) so an AI agent can drive this tab. No-op if none is running.
  useEffect(() => {
    startComposerBridge();
  }, []);

  // shotParams/mode live as local state here, not in the Zustand store, so the
  // bridge needs them handed over explicitly the same way ComposerViewport's
  // imperative API is handed over via a ref (see the effect below).
  useEffect(() => {
    registerShotAPI({ getShotParams: () => shotParams, setShotParams, getMode: () => mode, setMode: handleSetMode });
    return () => registerShotAPI(null);
  }, [shotParams, mode, handleSetMode, setShotParams]);

  // Global editing/timeline shortcuts. Kept separate from ComposerViewport's
  // bare-letter tool shortcuts (m/r/s/p/c), which explicitly ignore Ctrl/Cmd,
  // so the two listeners never fight over a key. A selected keyframe takes
  // priority over the selected object for Ctrl/Cmd+D and Delete/Backspace so
  // keyframe and object duplication/deletion never fight over the same key;
  // Space/Arrow scrubbing and Redo only make sense once there's a timeline.
  useEffect(() => {
    const FRAME_STEP = 1 / 24; // one frame at 24fps
    const BIG_STEP = 1; // one second

    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;

      const mod = e.ctrlKey || e.metaKey;
      const store = useComposerStore.getState();
      const { selectedObjectId, selectedKeyframeId, playback } = store;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) store.redo(); else store.undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        store.redo();
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (mode === 'motion' && selectedObjectId && selectedKeyframeId) store.duplicateKeyframe(selectedObjectId, selectedKeyframeId);
        else store.duplicateSelectedObject();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (mode === 'motion' && selectedObjectId && selectedKeyframeId) store.deleteKeyframe(selectedObjectId, selectedKeyframeId);
        else store.deleteSelectedObject();
      } else if (e.key === 'Escape') {
        store.clearSelection();
      } else if (mode === 'motion' && (e.key === ' ' || e.code === 'Space')) {
        e.preventDefault();
        if (playback.playing) {
          store.setPlaying(false);
        } else {
          store.setElapsed(playback.elapsed >= playback.duration ? 0 : playback.elapsed);
          store.setPlaying(true);
        }
      } else if (mode === 'motion' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const step = (e.shiftKey ? BIG_STEP : FRAME_STEP) * (e.key === 'ArrowLeft' ? -1 : 1);
        store.setPlaying(false);
        store.setElapsed(Math.min(playback.duration, Math.max(0, playback.elapsed + step)));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode]);

  // A Library link landing here with addToSequence=1 drops its shot straight
  // into the sequence strip once, the same way the old Shot Builder page did
  // on arrival. Guarded so it can't re-fire on an unrelated re-render.
  const handledIncomingRef = useRef(false);
  useEffect(() => {
    if (handledIncomingRef.current) return;
    handledIncomingRef.current = true;
    const incoming = parseIncomingShot(searchParams);
    if (incoming?.addToSequence) {
      const entry = describeShot(incoming.params);
      setSequence(prev => (prev.some(s => s.id === entry.id) ? prev : [...prev, entry]));
    }
  }, [searchParams]);

  // A Library pose card's "Open in Composer" (see ShotLibraryPage) lands here
  // with ?applyPose=<pose id>, once, on arrival — mirrors the addToSequence
  // guard above for the same reason (must not re-fire on an unrelated re-render).
  const handledPoseRef = useRef(false);
  useEffect(() => {
    if (handledPoseRef.current) return;
    handledPoseRef.current = true;
    const poseId = searchParams.get('applyPose');
    if (!poseId) return;
    loadPoseLibrary().then((poses) => {
      const pose = poses.find((p) => p.id === poseId);
      if (!pose) return;
      const state = useComposerStore.getState();
      const selected = state.objects.find((o) => o.id === state.selectedObjectId);
      const isCharacter = (o: SceneObject) => o.type === 'male' || o.type === 'female' || o.type === 'child';
      let targetId = selected && isCharacter(selected) ? selected.id : null;
      if (!targetId) targetId = state.objects.find(isCharacter)?.id ?? null;
      if (!targetId) {
        state.addObject('male');
        targetId = useComposerStore.getState().selectedObjectId;
      }
      if (!targetId) return;
      state.selectObject(targetId);
      state.applyPosture(targetId, pose.posture);
    });
  }, [searchParams]);

  // A Library card's "Preview"/"Apply" (see ShotLibraryPage) lands here with
  // ?applyMotion=<motion asset id>, once, on arrival — mirrors the guards
  // above for the same reason (must not re-fire on an unrelated re-render).
  const handledMotionRef = useRef(false);
  useEffect(() => {
    if (handledMotionRef.current) return;
    handledMotionRef.current = true;
    const motionId = searchParams.get('applyMotion');
    if (!motionId) return;
    const asset = loadMotionLibrary().find((m) => m.id === motionId);
    if (!asset) return;

    const state = useComposerStore.getState();
    const selected = state.objects.find((o) => o.id === state.selectedObjectId);
    let targetId = selected && isMotionCompatible(asset.objectType, selected.type) ? selected.id : null;
    if (!targetId) targetId = state.objects.find((o) => isMotionCompatible(asset.objectType, o.type))?.id ?? null;
    if (!targetId) {
      state.addObject(asset.objectType as MotionObjectType);
      targetId = useComposerStore.getState().selectedObjectId;
    }
    if (!targetId) return;

    applyMotionPreset(targetId, asset.keyframes.map((k) => ({ ...k, id: crypto.randomUUID() })));
    selectObject(targetId);
    setDuration(Math.max(useComposerStore.getState().playback.duration, asset.duration));
    if (searchParams.get('autoplay') === '1') {
      setElapsed(0);
      setPlaying(true);
    }
  }, [searchParams, applyMotionPreset, selectObject, setDuration, setElapsed, setPlaying]);

  // api?.getScene/getCamera only exist a render or two after mount.
  useEffect(() => {
    if (!viewportReady) return;
    setScene(viewportRef.current?.getScene() ?? null);
    setMainCamera(viewportRef.current?.getCamera() ?? null);
  }, [viewportReady]);

  useEffect(() => {
    registerViewportAPI(viewportReady ? viewportRef.current : null);
    return () => registerViewportAPI(null);
  }, [viewportReady]);

  // Apply the preset straight to the main viewport's own camera whenever the
  // shot controls or selection change. Deliberately excludes `objects`: a
  // manual Move/Rotate/Scale/Pose edit changes that store slice but not these
  // four values, so it never gets fought by a re-applied preset. Runs in both
  // modes so the viewport and Shot Preview always reflect the drafted shot;
  // in Motion, playback/export still go through the separate sequence camera.
  useEffect(() => {
    if (!viewportReady || (mode === 'static' && !canComposeShot)) return;
    viewportRef.current?.applyShot(shotParams);
  }, [viewportReady, mode, canComposeShot, selectedId, shotParams]);

  // A segment removed (or the sequence cleared) out from under an in-progress
  // edit must drop back to "drafting a new shot" rather than silently keep
  // pointing at a segment id that no longer exists.
  useEffect(() => {
    if (selectedSegmentId && !shotSequence.some(s => s.id === selectedSegmentId)) {
      setSelectedSegmentId(null);
    }
  }, [selectedSegmentId, shotSequence]);

  const selected = objects.find(c => c.id === selectedId) ?? null;
  const cineCamInstance = selected?.type === 'camera' ? (objectInstances.get(selected.id) as THREE.Camera | undefined) ?? null : null;
  const selectedPosture = selected?.posture ?? selected?.defaultPosture ?? null;

  const editingSegmentIndex = selectedSegmentId ? shotSequence.findIndex(s => s.id === selectedSegmentId) : -1;
  const editingSegmentLabel = editingSegmentIndex >= 0
    ? `#${editingSegmentIndex + 1} ${objects.find(o => o.id === shotSequence[editingSegmentIndex].targetId)?.name ?? '(deleted)'}`
    : null;

  function handleAddCurrentShot() {
    const entry = describeShot(shotParams);
    setSequence(prev => (prev.some(s => s.id === entry.id) ? prev : [...prev, entry]));
  }

  function handleSelectFromStrip(entry: ShotLibraryEntry) {
    setShotParams(entry.params);
  }

  // "ots" looks past the current selection at whichever other character is in
  // the scene — the same auto-pick ComposerViewport's applyShot already does
  // for the live Static-mode camera, just resolved as object ids here instead
  // of live roots (a ShotSegment stores ids, evaluated fresh every frame).
  function resolveSecondaryTargetId(): string | null {
    if (!selectedId || shotParams.angle !== 'ots') return null;
    const isCharacterType = (t: SceneObject['type']) => t === 'male' || t === 'female' || t === 'child';
    return objects.find(o => o.id !== selectedId && isCharacterType(o.type))?.id ?? null;
  }

  function handleAddToTimeline() {
    if (!selectedId) return;
    addShotSegment({ targetId: selectedId, secondaryTargetId: resolveSecondaryTargetId(), shotParams });
  }

  function handleUpdateSegment() {
    if (!selectedId || !selectedSegmentId) return;
    updateShotSegment(selectedSegmentId, { targetId: selectedId, secondaryTargetId: resolveSecondaryTargetId(), shotParams });
  }

  // Clicking a Shot Sequence card (see ShotSequenceTimeline) both scrubs the
  // timeline to that segment's own start time and loads its framing back into
  // the panel, so editing a shot always starts from what the timeline itself
  // says is true at that instant rather than whatever was last on screen.
  function handleSelectSegment(segment: ShotSegment, start: number) {
    setSelectedSegmentId(segment.id);
    setShotParams(segment.shotParams);
    selectObject(segment.targetId);
    setPlaying(false);
    setElapsed(start);
  }

  function handleCancelEditSegment() {
    setSelectedSegmentId(null);
  }

  function handleSetMode(next: ComposerMode) {
    setMode(next);
    if (next === 'static' && rightTab === 'motion') setRightTab('shot');
  }

  function handleSavePose() {
    if (!selectedPosture) return;
    const name = window.prompt('为这个姿势命名：');
    if (!name?.trim()) return;
    saveCustomPose(name.trim(), selectedPosture);
    window.alert(`已将“${name.trim()}”保存到姿势库。`);
  }

  async function handleSendToCanvas() {
    if (sendingToCanvas) return;
    setSendingToCanvas(true);
    setSendStatus('正在渲染截图…');
    try {
      const data = await viewportRef.current?.captureShot({ download: false });
      if (!data) throw new Error('截图失败');
      if (window.parent === window) throw new Error('请从无限画布 2 打开白模工作台');
      window.parent.postMessage({ type: 'white-model-send-shot', data, name: '白模镜头.png' }, window.location.origin);
      setSendStatus('正在发送到画布…');
    } catch (error) {
      setSendStatus(error instanceof Error ? error.message : '发送失败');
      setSendingToCanvas(false);
    }
  }

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (event.data?.type !== 'white-model-send-result') return;
      setSendingToCanvas(false);
      setSendStatus(event.data.ok ? '已发送到画布' : String(event.data.error || '发送失败'));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function handleSaveScene() {
    if (objects.length === 0) {
      window.alert('请先向场景中添加对象。');
      return;
    }
    const name = window.prompt('为这个场景命名：');
    if (!name?.trim()) return;
    saveSceneToLibrary(name, objects, duration, shotParams, activeCameraId);
    window.alert(`已将“${name.trim()}”保存到场景库。`);
  }

  function handleSaveMotion() {
    if (!selected) {
      window.alert('请选择要保存动作的人物或摄像机。');
      return;
    }
    if (selected.keyframes.length < 2) {
      window.alert('保存动作前至少需要两个关键帧。');
      return;
    }
    const name = window.prompt('为这个动作命名：');
    if (!name?.trim()) return;
    const category = window.prompt('分类（可选）：') ?? '';
    const description = window.prompt('说明（可选）：') ?? '';
    saveMotionToLibrary(name, category, description, selected, duration);
    window.alert(`已将“${name.trim()}”保存到动作库。`);
  }

  function handleClearScene() {
    if (objects.length === 0) return;
    if (!window.confirm('确定清空整个场景吗？此操作无法撤销。')) return;
    clearScene();
  }

  const topNav = (
    <nav className="composer-topnav">
      <span className="composer-topnav-title">3D 白模工作台</span>
      <div className="composer-topnav-links">
        <span className="composer-topnav-link">人物 · 姿势 · 镜头</span>
      </div>
      <div className="composer-topnav-actions">
        <span className="white-model-send-status" role="status">{sendStatus}</span>
        <button className="topbar-btn white-model-send-btn" onClick={handleSendToCanvas} disabled={sendingToCanvas || !viewportReady} title="将当前镜头作为图片节点放到无限画布">
          {sendingToCanvas ? '发送中…' : '发送到画布'}
        </button>
        <div className="topbar-group">
          <button className="topbar-btn" onClick={undo} disabled={!canUndo} title="撤销上一步场景修改">
            撤销
          </button>
          <button className="topbar-btn" onClick={redo} disabled={!canRedo} title="恢复上一步撤销的修改">
            重做
          </button>
        </div>

        <div className="topbar-divider" />

        <div className="topbar-group">
          <button className={`topbar-btn${grid ? ' on' : ''}`} onClick={() => setGrid(v => !v)} title="显示或隐藏网格">
            网格
          </button>
          <button className={`topbar-btn${compositionMode ? ' on' : ''}`} onClick={() => setCompositionMode(v => !v)} title="显示或隐藏构图辅助线">
            构图线
          </button>
        </div>

        <div className="topbar-divider" />

        <div className="topbar-group">
          <button className="topbar-btn" onClick={handleSavePose} disabled={!canPose || !selectedPosture} title="将所选人物的当前姿势保存到姿势库">
            保存姿势
          </button>
          <button className="topbar-btn" onClick={handleSaveScene} disabled={objects.length === 0} title="将当前场景保存到场景库">
            保存场景
          </button>
          {mode === 'motion' && (
            <button className="topbar-btn" onClick={handleSaveMotion} disabled={!selectedId} title="将当前对象的关键帧序列保存到动作库">
              保存动作
            </button>
          )}
        </div>

        <div className="topbar-divider" />

        <button className="topbar-btn danger" onClick={handleClearScene} disabled={objects.length === 0} title="清空整个场景">
          清空场景
        </button>

        <div className="mode-toggle" role="tablist" aria-label="编辑模式">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'static'}
            className={`mode-toggle-btn${mode === 'static' ? ' active' : ''}`}
            onClick={() => handleSetMode('static')}
          >
            静态
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'motion'}
            className={`mode-toggle-btn${mode === 'motion' ? ' active' : ''}`}
            onClick={() => handleSetMode('motion')}
          >
            动画
          </button>
        </div>

        <div className="topbar-divider" />

        <a
          href={`${import.meta.env.BASE_URL}help.html`}
          target="_blank"
          rel="noopener noreferrer"
          className="topbar-btn"
          title="帮助"
          aria-label="帮助"
        >
          ⓘ
        </a>
      </div>
    </nav>
  );

  // Desktop layout (original)
  if (!isMobile) {
    return (
      <div className="composer-page">
        {topNav}
        <div className="composer-layout" style={{ gridTemplateColumns: `${sidebarCollapsed ? '0' : '240px'} minmax(0,1fr) ${rightSidebarCollapsed ? '0' : '320px'}` }}>
          <aside className="scene-sidebar">
            <div className="sidebar-header">
              <h2>场景</h2>
            </div>
            <SceneTree
              objects={objects}
              selectedId={selectedId}
              onSelect={selectObject}
              onAddCharacter={(type: CharacterType) => addObject(type)}
              onAddPrimitive={(type: PrimitiveType) => addObject(type)}
              onAddCamera={mode === 'motion' ? (type) => addObject(type) : undefined}
              activeCameraId={mode === 'motion' ? activeCameraId : undefined}
              onSetActiveCamera={mode === 'motion' ? setActiveCamera : undefined}
              onToggleVisibility={toggleObjectVisibility}
              onToggleLock={toggleObjectLock}
              onDuplicate={duplicateObject}
              onDelete={deleteObject}
            />
          </aside>
          <button
            className="sidebar-toggle-floating"
            style={{ left: sidebarCollapsed ? 0 : 240 }}
            onClick={() => setSidebarCollapsed(v => !v)}
            title={sidebarCollapsed ? "展开场景栏" : "收起场景栏"}
            aria-label={sidebarCollapsed ? "展开场景栏" : "收起场景栏"}
          >
            {sidebarCollapsed ? "▶" : "◀"}
          </button>
          <section className="composer-center">
            <ComposerViewport
              ref={viewportRef}
              onSceneReady={() => setViewportReady(true)}
              mode={mode}
              grid={grid}
              compositionMode={compositionMode}
              onToggleComposition={() => setCompositionMode(v => !v)}
            />
          </section>
          <aside className="inspector">
            <div className="inspector-tabs" role="tablist" aria-label="右侧面板">
              <button role="tab" aria-selected={rightTab === 'shot'} className={`inspector-tab${rightTab === 'shot' ? ' active' : ''}`} onClick={() => setRightTab('shot')}>
                镜头
              </button>
              <button role="tab" aria-selected={rightTab === 'object'} className={`inspector-tab${rightTab === 'object' ? ' active' : ''}`} onClick={() => setRightTab('object')}>
                对象
              </button>
              {mode === 'motion' && (
                <button role="tab" aria-selected={rightTab === 'motion'} className={`inspector-tab${rightTab === 'motion' ? ' active' : ''}`} onClick={() => setRightTab('motion')}>
                  动作
                </button>
              )}
            </div>
            {rightTab === 'shot' && (
              <ShotBuilderPanel
                params={shotParams}
                onChange={setShotParams}
                scene={scene}
                camera={mainCamera}
                canCompose={canComposeShot}
                onAddToTimeline={mode === 'motion' ? handleAddToTimeline : undefined}
                editingSegmentLabel={mode === 'motion' ? editingSegmentLabel : null}
                onUpdateSegment={handleUpdateSegment}
                onCancelEdit={handleCancelEditSegment}
              />
            )}
            {rightTab === 'object' && (
              <Inspector
                character={selected}
                onRename={renameObject}
                onToggleVisibility={toggleObjectVisibility}
                onToggleLock={toggleObjectLock}
                onDuplicate={duplicateObject}
                onDelete={deleteObject}
                onUpdateTransform={updateObjectTransform}
              />
            )}
            {rightTab === 'motion' && mode === 'motion' && (
              selected?.type === 'camera'
                ? <CameraInspectorPanel scene={scene} cameraInstance={cineCamInstance} />
                : <PoseLibraryPanel />
            )}
          </aside>
          <button
            className="sidebar-toggle-floating"
            style={{ right: rightSidebarCollapsed ? 0 : 320 }}
            onClick={() => setRightSidebarCollapsed(v => !v)}
            title={rightSidebarCollapsed ? "展开检查器" : "收起检查器"}
            aria-label={rightSidebarCollapsed ? "展开检查器" : "收起检查器"}
          >
            {rightSidebarCollapsed ? "◀" : "▶"}
          </button>
        </div>
        <div className="composer-bottombar">
          {mode === 'static' ? (
            <ShotStrip
              shots={sequence}
              onSelect={handleSelectFromStrip}
              onRemove={(id) => setSequence(prev => prev.filter(s => s.id !== id))}
              headerExtra={
                <button type="button" className="composer-add-shot-btn" onClick={handleAddCurrentShot} disabled={!canComposeShot}>
                  + 添加当前镜头
                </button>
              }
            />
          ) : (
            <div className={`motion-timeline-panel${timelineCollapsed ? ' collapsed' : ''}`}>
              <div className="motion-timeline-header">
                <button
                  type="button"
                  className="timeline-collapse-btn"
                  onClick={() => setTimelineCollapsed(v => !v)}
                  title={timelineCollapsed ? '展开时间线' : '收起时间线'}
                  aria-label={timelineCollapsed ? '展开时间线' : '收起时间线'}
                >
                  {timelineCollapsed ? '▲' : '▼'}
                </button>
                <TransportBar
                  playing={playing} elapsed={elapsed} duration={duration}
                  onPlay={() => { setElapsed(elapsed >= duration ? 0 : elapsed); setPlaying(true); }}
                  onPause={() => setPlaying(false)}
                  onStop={() => { setPlaying(false); setElapsed(0); }}
                  onScrub={(t) => { setPlaying(false); setElapsed(t); }}
                />
                <span className="motion-timeline-summary">
                  {shotSequence.length} 个镜头 · {sequenceDuration(shotSequence).toFixed(1)} 秒
                </span>
              </div>
              {!timelineCollapsed && (
                <div className="motion-timeline-body">
                  <ShotSequenceTimeline selectedSegmentId={selectedSegmentId} onSelectSegment={handleSelectSegment} />
                  <label className="motion-timeline-settings">
                    速度
                    <input type="number" min={0.1} max={3} step={0.1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
                    总时长
                    <input type="number" min={1} max={30} step={0.5} value={duration} onChange={(e) => { setDuration(Number(e.target.value)); setElapsed(Math.min(elapsed, Number(e.target.value))); }} />
                    s
                  </label>
                  <details className="motion-object-keyframes">
                    <summary>对象关键帧</summary>
                    <Timeline />
                  </details>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mobile layout
  return (
    <div className="composer-layout-mobile">
      {/* Viewport - always rendered but only visible when active tab */}
      <section className={`composer-center-mobile ${mobileTab === 'viewport' ? 'active' : ''}`}>
        <ComposerViewport
          ref={viewportRef}
          onSceneReady={() => setViewportReady(true)}
          mode="static"
          grid={grid}
          compositionMode={compositionMode}
          onToggleComposition={() => setCompositionMode(v => !v)}
        />
        {/* Capture Shot button - top right on mobile */}
        <button className="capture-shot-btn capture-shot-btn-mobile"
                onClick={() => viewportRef.current?.captureShot()}
                title="截取镜头（PNG）">
          截取镜头
        </button>
        <button className="capture-shot-btn capture-shot-btn-mobile white-model-mobile-send"
                onClick={handleSendToCanvas} disabled={sendingToCanvas || !viewportReady}>
          {sendingToCanvas ? '发送中…' : '发送到画布'}
        </button>
      </section>

      {/* Scene Panel - full screen overlay */}
      <aside className={`scene-panel-mobile ${mobileTab === 'scene' ? 'active' : ''}`}>
        <div className="mobile-panel-header">
          <h2>场景</h2>
        </div>
        <SceneTree
          objects={objects}
          selectedId={selectedId}
          onSelect={selectObject}
          onAddCharacter={(type: CharacterType) => addObject(type)}
          onAddPrimitive={(type: PrimitiveType) => addObject(type)}
          onToggleVisibility={toggleObjectVisibility}
          onToggleLock={toggleObjectLock}
          onDuplicate={duplicateObject}
          onDelete={deleteObject}
        />
      </aside>

      {/* Inspector Panel - full screen overlay */}
      <aside className={`inspector-panel-mobile ${mobileTab === 'inspector' ? 'active' : ''}`}>
        <div className="mobile-panel-header">
          <h2>检查器</h2>
        </div>
        <Inspector
          character={selected}
          onRename={renameObject}
          onToggleVisibility={toggleObjectVisibility}
          onToggleLock={toggleObjectLock}
          onDuplicate={duplicateObject}
          onDelete={deleteObject}
          onUpdateTransform={updateObjectTransform}
        />
      </aside>

      {/* Bottom Tab Bar */}
      <nav className="mobile-tab-bar" role="tablist" aria-label="白模编辑面板">
        <button
          role="tab"
          aria-selected={mobileTab === 'scene'}
          aria-controls="scene-panel"
          className={`mobile-tab ${mobileTab === 'scene' ? 'active' : ''}`}
          onClick={() => setMobileTab('scene')}
        >
          <span className="tab-icon">☰</span>
          <span className="tab-label">场景</span>
        </button>
        <button
          role="tab"
          aria-selected={mobileTab === 'viewport'}
          aria-controls="viewport-panel"
          className={`mobile-tab ${mobileTab === 'viewport' ? 'active' : ''}`}
          onClick={() => setMobileTab('viewport')}
        >
          <span className="tab-icon">⬜</span>
          <span className="tab-label">视口</span>
        </button>
        <button
          role="tab"
          aria-selected={mobileTab === 'inspector'}
          aria-controls="inspector-panel"
          className={`mobile-tab ${mobileTab === 'inspector' ? 'active' : ''}`}
          onClick={() => setMobileTab('inspector')}
        >
          <span className="tab-icon">⚙</span>
          <span className="tab-label">检查器</span>
        </button>
      </nav>

      {/* Mobile Workspace Toolbar - uses store directly */}
      <div className="mobile-toolbar-wrapper">
        <div className="mobile-toolbar">
          <div className="mobile-toolbar-tools">
            <button
              className={activeTool === 'move' ? 'on' : ''}
              title="移动（平移）"
              onClick={() => setActiveTool('move')}
            >
              移动
            </button>
            <button
              className={activeTool === 'rotate' ? 'on' : ''}
              title="旋转"
              onClick={() => setActiveTool('rotate')}
            >
              旋转
            </button>
            <button
              className={activeTool === 'scale' ? 'on' : ''}
              title="缩放"
              onClick={() => setActiveTool('scale')}
            >
              缩放
            </button>
            <button
              className={activeTool === 'pose' ? 'on' : ''}
              disabled={!canPose}
              title={canPose ? '姿势（旋转身体关节）' : '只有人体白模可以调整姿势'}
              onClick={() => setActiveTool('pose')}
            >
              姿势
            </button>
          </div>
          <span>缩放 <b id="mobile-zoom-display">100%</b></span>
          <button title="放大" onClick={() => viewportRef.current?.zoomIn()}>+</button>
          <button title="缩小" onClick={() => viewportRef.current?.zoomOut()}>-</button>
        </div>
      </div>
    </div>
  );
}

export default ComposerShell;
