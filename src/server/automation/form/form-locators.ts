import { currentFormDefinition } from "@/lib/forms/current-form-definition";

export const FORM_BUTTONS = {
  next: currentFormDefinition.buttons.next,
  submit: currentFormDefinition.buttons.submit
} as const;

export const GOOGLE_FORM_LABELS = currentFormDefinition.labels;
