import "./SceneTree.css";

export type CharacterType = "male" | "female" | "child";
export type PrimitiveType = "cube" | "plane" | "cylinder" | "sphere" | "capsule" | "cone" | "torus";
export type ObjectType = CharacterType | PrimitiveType | "camera";

export interface SceneObjectData {
  id: string;
  name: string;
  type: ObjectType;
  visible: boolean;
  locked: boolean;
}

interface SceneTreeProps {
  objects: SceneObjectData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddCharacter: (type: CharacterType) => void;
  onAddPrimitive: (type: PrimitiveType) => void;
  /** Optional: only the motion editor passes this, so the main composer's SceneTree renders unchanged. */
  onAddCamera?: (type: "camera") => void;
  /** Which camera is the active/viewing camera — motion editor only, drives the CAMERAS section's badge/button. */
  activeCameraId?: string | null;
  onSetActiveCamera?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const CHARACTER_TYPES: CharacterType[] = ["male", "female", "child"];
const PRIMITIVE_TYPES: PrimitiveType[] = ["cube", "plane", "cylinder", "sphere", "capsule", "cone", "torus"];

const PRIMITIVE_LABELS: Record<PrimitiveType, string> = {
  cube: "立方体",
  plane: "平面",
  cylinder: "圆柱体",
  sphere: "球体",
  capsule: "胶囊体",
  cone: "圆锥体",
  torus: "圆环",
};

const CHARACTER_LABELS: Record<CharacterType, string> = {
  male: "男性",
  female: "女性",
  child: "儿童",
};

const TYPE_LABELS: Record<ObjectType, string> = {
  ...CHARACTER_LABELS,
  ...PRIMITIVE_LABELS,
  camera: "摄像机",
};

export default function SceneTree({
  objects,
  selectedId,
  onSelect,
  onAddCharacter,
  onAddPrimitive,
  onAddCamera,
  activeCameraId,
  onSetActiveCamera,
  onToggleVisibility,
  onToggleLock,
  onDuplicate,
  onDelete,
}: SceneTreeProps) {
  return (
    <div className="scene-tree">
      {/* CHARACTERS SECTION */}
      <details className="scene-section" open>
        <summary className="scene-section-header">人物</summary>
        <div className="scene-section-body">
          <div className="scene-add-buttons">
            {CHARACTER_TYPES.map((type) => (
              <button key={type} onClick={() => onAddCharacter(type)}>
                + {CHARACTER_LABELS[type]}
              </button>
            ))}
          </div>

          <div className="scene-character-list">
            {objects.filter(o => !["cube", "plane", "cylinder", "sphere", "capsule", "cone", "torus", "camera"].includes(o.type)).length === 0 && (
              <div className="scene-empty">暂无人物</div>
            )}

            {objects
              .filter((o) => !["cube", "plane", "cylinder", "sphere", "capsule", "cone", "torus", "camera"].includes(o.type))
              .map((object) => {
                const isSelected = selectedId === object.id;
                return (
                  <SceneObjectItem
                    key={object.id}
                    object={object}
                    isSelected={isSelected}
                    onSelect={onSelect}
                    onToggleVisibility={onToggleVisibility}
                    onToggleLock={onToggleLock}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                  />
                );
              })}
          </div>
        </div>
      </details>

      {/* PRIMITIVES SECTION */}
      <details className="scene-section" open>
        <summary className="scene-section-header">基础模型</summary>
        <div className="scene-section-body">
          <div className="scene-add-buttons">
            {PRIMITIVE_TYPES.map((type) => (
              <button key={type} onClick={() => onAddPrimitive(type)}>
                + {PRIMITIVE_LABELS[type]}
              </button>
            ))}
          </div>

          <div className="scene-character-list">
            {objects.filter(o => ["cube", "plane", "cylinder", "sphere", "capsule", "cone", "torus"].includes(o.type)).length === 0 && (
              <div className="scene-empty">暂无基础模型</div>
            )}

            {objects
              .filter((o) => ["cube", "plane", "cylinder", "sphere", "capsule", "cone", "torus"].includes(o.type))
              .map((object) => {
                const isSelected = selectedId === object.id;
                return (
                  <SceneObjectItem
                    key={object.id}
                    object={object}
                    isSelected={isSelected}
                    onSelect={onSelect}
                    onToggleVisibility={onToggleVisibility}
                    onToggleLock={onToggleLock}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                  />
                );
              })}
          </div>
        </div>
      </details>

      {/* CAMERAS SECTION — motion editor only */}
      {onAddCamera && (
        <details className="scene-section" open>
          <summary className="scene-section-header">摄像机</summary>
          <div className="scene-section-body">
            <div className="scene-add-buttons">
              <button onClick={() => onAddCamera("camera")}>+ 摄像机</button>
            </div>

            <div className="scene-character-list">
              {objects.filter((o) => o.type === "camera").length === 0 && (
                <div className="scene-empty">暂无摄像机</div>
              )}

              {objects
                .filter((o) => o.type === "camera")
                .map((object) => {
                  const isSelected = selectedId === object.id;
                  return (
                    <SceneObjectItem
                      key={object.id}
                      object={object}
                      isSelected={isSelected}
                      isActiveCamera={activeCameraId === object.id}
                      onSetActiveCamera={onSetActiveCamera}
                      onSelect={onSelect}
                      onToggleVisibility={onToggleVisibility}
                      onToggleLock={onToggleLock}
                      onDuplicate={onDuplicate}
                      onDelete={onDelete}
                    />
                  );
                })}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

function SceneObjectItem({
  object,
  isSelected,
  isActiveCamera,
  onSetActiveCamera,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDuplicate,
  onDelete,
}: {
  object: SceneObjectData;
  isSelected: boolean;
  isActiveCamera?: boolean;
  onSetActiveCamera?: (id: string) => void;
  onSelect: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <div
      className={isSelected ? "scene-item selected" : "scene-item"}
      onClick={() => onSelect(object.id)}
    >
      <div className="scene-item-row">
        <span>{object.name}</span>
        <small>{TYPE_LABELS[object.type]}</small>
        {isActiveCamera && (
          <small className="scene-item-active-camera" title="当前用于查看和导出的摄像机">
            ● 当前
          </small>
        )}
        {object.locked && (
          <small className="scene-item-locked" title="已锁定">
            🔒
          </small>
        )}
        {!object.visible && (
          <small className="scene-item-hidden" title="已隐藏">
            👁‍🗨
          </small>
        )}
      </div>

      {isSelected && (
        <div className="scene-item-actions">
          {onSetActiveCamera && !isActiveCamera && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetActiveCamera(object.id);
              }}
              title="设为当前摄像机"
            >
              设为当前
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility?.(object.id);
            }}
            title={object.visible ? "隐藏" : "显示"}
          >
            {object.visible ? "隐藏" : "显示"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock?.(object.id);
            }}
            title={object.locked ? "解锁" : "锁定"}
          >
            {object.locked ? "解锁" : "锁定"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate?.(object.id);
            }}
            title="复制"
          >
            复制
          </button>
          <button
            className="danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(object.id);
            }}
            title="删除"
          >
            删除
          </button>
        </div>
      )}
    </div>
  );
}
