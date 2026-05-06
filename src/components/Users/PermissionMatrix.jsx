import React, { useMemo, useCallback } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Shield, RotateCcw, Lock } from 'lucide-react';
import styles from '../Settings/AddUnitForm.module.css';

const MODULES = [
  { key: 'dashboard', label: 'Dashboard', actions: ['read'] },
  { key: 'ativos', label: 'Inventário', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'monitoramento', label: 'Monitoramento', actions: ['read'] },
  { key: 'movimentacao', label: 'Movimentação', actions: ['create'] },
  { key: 'preventiva', label: 'Preventiva', actions: ['create'] },
  { key: 'cadastros_unidades', label: 'Cad: Unidades', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'cadastros_modelos', label: 'Cad: Modelos', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'cadastros_empresas', label: 'Cad: Empresas', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'cadastros_opcoes', label: 'Cad: Opções', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'usuarios', label: 'Usuários', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'perfis', label: 'Perfis', actions: ['create', 'read', 'update', 'delete'] },
];

const ACTION_LABELS = {
  create: 'Criar',
  read: 'Ver',
  update: 'Editar',
  delete: 'Excluir',
};

const PermissionMatrix = ({ control, profilePermissions, onResetAll }) => {
  const watchedValuesRaw = useWatch({ control, name: 'customPermissions' });

  const watchedValues = useMemo(() => {
    return watchedValuesRaw || {};
  }, [watchedValuesRaw]);

  const hasAnyCustomization = useMemo(() => {
    return Object.keys(watchedValues).some(key =>
      watchedValues[key] && Object.keys(watchedValues[key]).some(action => watchedValues[key][action] !== undefined && watchedValues[key][action] !== null)
    );
  }, [watchedValues]);

  const isModuleCustomized = useCallback((moduleKey) => {
    const custom = watchedValues[moduleKey];
    if (!custom) return false;
    return Object.keys(custom).some(action => custom[action] !== undefined && custom[action] !== null);
  }, [watchedValues]);

  return (
    <div className={styles.permissionsMatrix}>
      <div className={styles.permissionsHeader}>
        <div className={styles.permissionsTitle}>
          <Shield size={18} />
          <span>Permissões Customizadas</span>
          {hasAnyCustomization && (
            <span className={styles.customizedBadge}>Personalizado</span>
          )}
        </div>
        {hasAnyCustomization && (
          <button
            type="button"
            onClick={onResetAll}
            className={styles.resetAllButton}
          >
            <RotateCcw size={14} />
            Limpar todas
          </button>
        )}
      </div>

      <p className={styles.permissionsHint}>
        Ative ou desative as permissões que deseja customizar para este usuário. As não modificadas serão herdadas do perfil.
      </p>

      <div className={styles.permissionsGrid}>
        {MODULES.map(module => {
          const isCustomized = isModuleCustomized(module.key);

          return (
            <div
              key={module.key}
              className={`${styles.permissionModule} ${isCustomized ? styles.permissionModuleCustom : ''}`}
            >
              <div className={styles.moduleHeader}>
                <span className={styles.moduleName}>
                  {isCustomized && <Lock size={12} className={styles.lockIcon} />}
                  {module.label}
                </span>
                {isCustomized && (
                  <button
                    type="button"
                    onClick={() => {
                      const { setValue } = control;
                      setValue(`customPermissions.${module.key}`, null, { shouldDirty: true });
                    }}
                    className={styles.resetModuleButton}
                    title="Resetar para herdar do perfil"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>

              <div className={styles.moduleActions}>
                {module.actions.map(action => {
                  const fieldPath = `customPermissions.${module.key}.${action}`;
                  const inheritedValue = profilePermissions?.[module.key]?.[action] ?? false;

                  return (
                    <Controller
                      key={action}
                      name={fieldPath}
                      control={control}
                      render={({ field }) => {
                        const hasCustomValue = field.value !== undefined && field.value !== null;
                        const effectiveValue = hasCustomValue ? field.value : inheritedValue;

                        return (
                          <label className={`${styles.permissionAction} ${hasCustomValue ? styles.permissionActionCustom : ''}`}>
                            <input
                              type="checkbox"
                              checked={effectiveValue}
                              onChange={(e) => {
                                field.onChange(e.target.checked ? true : false);
                              }}
                            />
                            <span>{ACTION_LABELS[action]}</span>
                            {!hasCustomValue && (
                              <span className={styles.inheritedTag} title={`Herdado do perfil: ${inheritedValue ? 'Ativo' : 'Inativo'}`}>
                                herdado
                              </span>
                            )}
                          </label>
                        );
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PermissionMatrix;