import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserPermissions } from '@/types/user';
import type { PermissionLevel, SettingsTabId } from '@/types/permissions';
import { SETTINGS_TAB_LABELS, SETTINGS_TAB_IDS } from '@/types/permissions';
import { normalizePermissionLevel } from '@/types/permissions';
import { Eye, Pencil, Trash2, Plus, Minus } from 'lucide-react';

const RESOURCE_FIELDS: { key: keyof UserPermissions; label: string }[] = [
  { key: 'patients', label: 'Pacientes' },
  { key: 'medicalRecords', label: 'Prontuários Médicos' },
  { key: 'schedule', label: 'Agenda' },
  { key: 'settings', label: 'Configurações' },
  { key: 'userManagement', label: 'Gerenciamento de Atendentes' },
  { key: 'scheduleManagement', label: 'Gerenciamento de Horários' },
  { key: 'serviceManagement', label: 'Gerenciamento de Serviços' },
  { key: 'integrations', label: 'Integrações' },
  { key: 'audit', label: 'Auditoria' },
];

interface RolePermissionsEditorProps {
  permissions: UserPermissions;
  onChange: (permissions: UserPermissions) => void;
  idPrefix?: string;
}

/** Dado o nível, aplica regra em cascata ao marcar Editar ou Deletar */
function levelFromCheckboxes(view: boolean, edit: boolean, del: boolean): PermissionLevel {
  if (del) return 'delete';
  if (edit) return 'edit';
  if (view) return 'view';
  return 'none';
}

function hasAnySettingsTabPermission(permissions: UserPermissions | undefined): boolean {
  if (!permissions?.settingsTabs) return false;
  return SETTINGS_TAB_IDS.some(
    (tab) => normalizePermissionLevel(permissions.settingsTabs?.[tab]) !== 'none'
  );
}

export function RolePermissionsEditor({ permissions, onChange, idPrefix = '' }: RolePermissionsEditorProps) {
  const [configTabsExpanded, setConfigTabsExpanded] = useState(() =>
    hasAnySettingsTabPermission(permissions)
  );

  const getLevel = (key: keyof UserPermissions): PermissionLevel => {
    const v = permissions[key];
    return normalizePermissionLevel(v);
  };

  const getSettingsTabLevel = (tab: SettingsTabId): PermissionLevel => {
    return normalizePermissionLevel(permissions.settingsTabs?.[tab]);
  };

  const setLevel = (key: keyof UserPermissions, level: PermissionLevel) => {
    onChange({ ...permissions, [key]: level });
  };

  const setSettingsTabLevel = (tab: SettingsTabId, level: PermissionLevel) => {
    onChange({
      ...permissions,
      settingsTabs: { ...permissions.settingsTabs, [tab]: level },
    });
  };

  const handleResourceCheck = (
    key: keyof UserPermissions,
    action: 'view' | 'edit' | 'delete',
    checked: boolean
  ) => {
    const level = getLevel(key);
    const view = level !== 'none';
    const edit = level === 'edit' || level === 'delete';
    const del = level === 'delete';
    let newView = view;
    let newEdit = edit;
    let newDel = del;
    if (action === 'view') {
      newView = checked;
      if (!checked) {
        newEdit = false;
        newDel = false;
      }
    } else if (action === 'edit') {
      newEdit = checked;
      if (checked) newView = true;
      else newDel = false;
    } else {
      newDel = checked;
      if (checked) {
        newEdit = true;
        newView = true;
      }
    }
    const newLevel = levelFromCheckboxes(newView, newEdit, newDel);
    if (key === 'settings' && newLevel !== 'none') {
      const allTabsLevel = SETTINGS_TAB_IDS.reduce(
        (acc, tab) => ({ ...acc, [tab]: newLevel }),
        {} as Record<SettingsTabId, PermissionLevel>
      );
      onChange({ ...permissions, [key]: newLevel, settingsTabs: allTabsLevel });
    } else {
      setLevel(key, newLevel);
    }
  };

  const handleSettingsTabCheck = (
    tab: SettingsTabId,
    action: 'view' | 'edit' | 'delete',
    checked: boolean
  ) => {
    const level = getSettingsTabLevel(tab);
    const view = level !== 'none';
    const edit = level === 'edit' || level === 'delete';
    const del = level === 'delete';
    let newView = view;
    let newEdit = edit;
    let newDel = del;
    if (action === 'view') {
      newView = checked;
      if (!checked) {
        newEdit = false;
        newDel = false;
      }
    } else if (action === 'edit') {
      newEdit = checked;
      if (checked) newView = true;
      else newDel = false;
    } else {
      newDel = checked;
      if (checked) {
        newEdit = true;
        newView = true;
      }
    }
    setSettingsTabLevel(tab, levelFromCheckboxes(newView, newEdit, newDel));
  };

  const PermissionRow = ({
    id,
    label,
    level,
    onCheck,
    indent,
  }: {
    id: string;
    label: string;
    level: PermissionLevel;
    onCheck: (action: 'view' | 'edit' | 'delete', checked: boolean) => void;
    indent?: boolean;
  }) => {
    const view = level !== 'none';
    const edit = level === 'edit' || level === 'delete';
    const del = level === 'delete';
    return (
      <TableRow className={indent ? 'bg-muted/20' : undefined}>
        <TableCell className={`font-medium align-middle ${indent ? 'pl-10 text-muted-foreground' : ''}`}>
          {label}
        </TableCell>
        <TableCell className="text-center w-[80px]">
          <Checkbox
            id={`${idPrefix}-${id}-view`}
            checked={view}
            onCheckedChange={(c) => onCheck('view', c === true)}
          />
        </TableCell>
        <TableCell className="text-center w-[80px]">
          <Checkbox
            id={`${idPrefix}-${id}-edit`}
            checked={edit}
            onCheckedChange={(c) => onCheck('edit', c === true)}
          />
        </TableCell>
        <TableCell className="text-center w-[80px]">
          <Checkbox
            id={`${idPrefix}-${id}-delete`}
            checked={del}
            onCheckedChange={(c) => onCheck('delete', c === true)}
          />
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">Telas</Label>
      <p className="text-xs text-muted-foreground">
        Marque Visualizar, Editar ou Deletar para cada tela. Editar marca Visualizar; Deletar marca Editar e Visualizar.
        Em Configurações, os checkboxes liberam todas as abas; use o + para definir por aba.
      </p>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[280px]">Tela</TableHead>
              <TableHead className="text-center w-[80px]">
                <span className="flex items-center justify-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  <span className="text-xs font-medium">Visualizar</span>
                </span>
              </TableHead>
              <TableHead className="text-center w-[80px]">
                <span className="flex items-center justify-center gap-1.5">
                  <Pencil className="h-4 w-4" />
                  <span className="text-xs font-medium">Editar</span>
                </span>
              </TableHead>
              <TableHead className="text-center w-[80px]">
                <span className="flex items-center justify-center gap-1.5">
                  <Trash2 className="h-4 w-4" />
                  <span className="text-xs font-medium">Deletar</span>
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {RESOURCE_FIELDS.flatMap(({ key, label }) => [
              <TableRow key={key}>
                <TableCell className="font-medium align-middle">
                  {key === 'settings' ? (
                    <div className="flex items-center justify-between w-full gap-2">
                      <span>{label}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setConfigTabsExpanded((e) => !e)}
                        aria-label={configTabsExpanded ? 'Recolher abas' : 'Expandir abas'}
                      >
                        {configTabsExpanded ? (
                          <Minus className="h-3.5 w-3.5" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <span>{label}</span>
                  )}
                </TableCell>
                <TableCell className="text-center w-[80px]">
                  <Checkbox
                    id={`${idPrefix}-${key}-view`}
                    checked={getLevel(key) !== 'none'}
                    onCheckedChange={(c) => handleResourceCheck(key, 'view', c === true)}
                  />
                </TableCell>
                <TableCell className="text-center w-[80px]">
                  <Checkbox
                    id={`${idPrefix}-${key}-edit`}
                    checked={getLevel(key) === 'edit' || getLevel(key) === 'delete'}
                    onCheckedChange={(c) => handleResourceCheck(key, 'edit', c === true)}
                  />
                </TableCell>
                <TableCell className="text-center w-[80px]">
                  <Checkbox
                    id={`${idPrefix}-${key}-delete`}
                    checked={getLevel(key) === 'delete'}
                    onCheckedChange={(c) => handleResourceCheck(key, 'delete', c === true)}
                  />
                </TableCell>
              </TableRow>,
              ...(key === 'settings' && configTabsExpanded
                ? SETTINGS_TAB_IDS.map((tab) => (
                    <PermissionRow
                      key={tab}
                      id={`settings-${tab}`}
                      label={SETTINGS_TAB_LABELS[tab]}
                      level={getSettingsTabLevel(tab)}
                      onCheck={(action, checked) => handleSettingsTabCheck(tab, action, checked)}
                      indent
                    />
                  ))
                : []),
            ])}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
