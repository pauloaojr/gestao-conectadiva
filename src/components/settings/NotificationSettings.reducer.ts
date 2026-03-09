import {
  NotificationChannel,
  NotificationEventKey,
  NotificationRecipientTarget,
  NotificationRule,
  NotificationService,
  NotificationTiming,
} from "@/hooks/useNotificationSettings";
import { NotificationMediaItem, serializeNotificationMedia } from "@/lib/notificationMedia";

export type DraftAction =
  | { type: "replace"; rule: NotificationRule }
  | { type: "set_name"; value: string }
  | { type: "set_enabled"; value: boolean }
  | { type: "toggle_channel"; channel: NotificationChannel; checked: boolean }
  | { type: "set_service"; service: NotificationService; defaultEvent: NotificationEventKey }
  | { type: "set_recipient_target"; value: NotificationRecipientTarget }
  | { type: "set_event"; value: NotificationEventKey }
  | { type: "set_message"; value: string }
  | { type: "append_placeholder"; value: string }
  | { type: "set_media_url"; value: string }
  | { type: "set_media_items"; value: NotificationMediaItem[] }
  | { type: "set_hours"; value: number }
  | { type: "set_timing"; value: NotificationTiming }
  | { type: "set_send_time"; value: string };

export function draftReducer(
  state: NotificationRule,
  action: DraftAction
): NotificationRule {
  switch (action.type) {
    case "replace":
      return action.rule;
    case "set_name":
      return { ...state, name: action.value };
    case "set_enabled":
      return { ...state, enabled: action.value };
    case "toggle_channel":
      if (action.checked) {
        if (state.channels.includes(action.channel)) return state;
        return { ...state, channels: [...state.channels, action.channel] };
      }
      return {
        ...state,
        channels: state.channels.filter((item) => item !== action.channel),
      };
    case "set_service":
      return { ...state, service: action.service, eventKey: action.defaultEvent };
    case "set_recipient_target":
      return { ...state, recipientTarget: action.value };
    case "set_event":
      return { ...state, eventKey: action.value };
    case "set_message":
      return { ...state, message: action.value };
    case "append_placeholder":
      return {
        ...state,
        message: state.message ? `${state.message} ${action.value}` : action.value,
      };
    case "set_media_url":
      return { ...state, mediaUrl: action.value };
    case "set_media_items":
      return { ...state, mediaUrl: serializeNotificationMedia(action.value) };
    case "set_hours":
      return { ...state, hours: action.value };
    case "set_timing":
      return { ...state, timing: action.value };
    case "set_send_time":
      return { ...state, sendTime: action.value };
    default:
      return state;
  }
}
