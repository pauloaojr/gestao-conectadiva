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
import { Eye, Pencil, Trash2, Plus, Minus, Activity } from 'lucide-react';

const RESOURCE_FIELDS: { key: keyof UserPermissions; label: string }[] = [
  { key: 'patients', label: 'Pacientes' },
  { key: 'medicalRecords', label: 'Prontuários Médicos' },
  { key: 'schedule', label: 'Agenda' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'settings', label: 'Configurações' },
  { key: 'userManagement', label: 'Gerenciamento de Atendentes' },
  { key: 'scheduleManagement', label: 'Gerenciamento de Horários' },
  { key: 'serviceManagement', label: 'Gerenciamento de Serviços' },
  { key: 'integrations', label: 'Integrações' },
  { key: 'api', label: 'API' },
  { key: 'audit', label: 'Auditoria' },
];

interface RolePermissionsEditorProps {
  permissions: UserPermissions;
  onChange: (permissions: UserPermissions) => void;
  idPrefix?: string;
}

/** Dado o nível, aplica regra em cascata ao marcar Alterar Status, Editar ou Deletar */
function levelFromCheckboxes(view: boolean, status: boolean, edit: boolean, del: boolean): PermissionLevel {
  if (del) return 'delete';
  if (edit) return 'edit';
  if (status) return 'status';
  if (view) return 'view';
  return 'none';
}

/** Para recursos que não têm "Alterar Status" (todos exceto schedule), usa 3 checkboxes */
function levelFromCheckboxes3(view: boolean, edit: boolean, del: boolean): PermissionLevel {
  return levelFromCheckboxes(view, false, edit, del);
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
    action: 'view' | 'status' | 'edit' | 'delete',
    checked: boolean
  ) => {
    const level = getLevel(key);
    const view = level !== 'none';
    const status = level === 'status' || level === 'edit' || level === 'delete';
    const edit = level === 'edit' || level === 'delete';
    const del = level === 'delete';
    let newView = view;
    let newStatus = status;
    let newEdit = edit;
    let newDel = del;
    if (action === 'view') {
      newView = checked;
      if (!checked) {
        newStatus = false;
        newEdit = false;
        newDel = false;
      }
    } else if (action === 'status') {
      newStatus = checked;
      if (checked) newView = true;
      else {
        newEdit = false;
        newDel = false;
      }
    } else if (action === 'edit') {
      newEdit = checked;
      if (checked) {
        newView = true;
        newStatus = true;
      } else newDel = false;
    } else {
      newDel = checked;
      if (checked) {
        newEdit = true;
        newStatus = true;
        newView = true;
      }
    }
    const newLevel = key === 'schedule'
      ? levelFromCheckboxes(newView, newStatus, newEdit, newDel)
      : levelFromCheckboxes3(newView, newEdit, newDel);
    if (key === 'settings') {
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
    action: 'view' | 'status' | 'edit' | 'delete',
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
    } else if (action === 'status') {
      // Settings tabs não têm "Alterar Status" - tratar como edit
      newEdit = checked;
      if (checked) newView = true;
      else newDel = false;
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
    setSettingsTabLevel(tab, levelFromCheckboxes3(newView, newEdit, newDel));
  };

  const PermissionRow = ({
    id,
    label,
    level,
    onCheck,
    indent,
    showStatus = false,
  }: {
    id: string;
    label: string;
    level: PermissionLevel;
    onCheck: (action: 'view' | 'status' | 'edit' | 'delete', checked: boolean) => void;
    indent?: boolean;
    showStatus?: boolean;
  }) => {
    const view = level !== 'none';
    const status = level === 'status' || level === 'edit' || level === 'delete';
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
        {showStatus ? (
          <TableCell className="text-center w-[80px]">
            <Checkbox
              id={`${idPrefix}-${id}-status`}
              checked={status}
              onCheckedChange={(c) => onCheck('status', c === true)}
            />
          </TableCell>
        ) : (
          <TableCell className="text-center w-[80px] text-muted-foreground">—</TableCell>
        )}
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
        Marque Visualizar, Editar ou Deletar para cada tela. Em Agenda, &quot;Alterar Status&quot; permite apenas mudar o status do agendamento; &quot;Editar&quot; permite edição completa. Editar marca Visualizar; Deletar marca Editar e Visualizar.
        Em Configurações, os checkboxes liberam todas as abas; use o + para definir por aba.
        Em Relatórios: quem tem apenas Visualizar acessa os relatórios mas não vê a coluna &quot;Data do Recebimento&quot; no Repasses; Editar ou Deletar exibe essa coluna.
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
                <span className="flex items-center justify-center gap-1.5" title="Apenas Agenda">
                  <Activity className="h-4 w-4" />
                  <span className="text-xs font-medium">Alterar Status</span>
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
                {key === 'schedule' ? (
                  <TableCell className="text-center w-[80px]">
                    <Checkbox
                      id={`${idPrefix}-${key}-status`}
                      checked={getLevel(key) === 'status' || getLevel(key) === 'edit' || getLevel(key) === 'delete'}
                      onCheckedChange={(c) => handleResourceCheck(key, 'status', c === true)}
                    />
                  </TableCell>
                ) : (
                  <TableCell className="text-center w-[80px] text-muted-foreground">—</TableCell>
                )}
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
                      onCheck={(action, checked) => handleSettingsTabCheck(tab, action === 'status' ? 'edit' : action, checked)}
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
