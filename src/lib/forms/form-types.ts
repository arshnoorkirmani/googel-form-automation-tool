export type FormFieldType =
  | "checkbox"
  | "text"
  | "textarea"
  | "dropdown"
  | "dateTime";

export type FormFieldInteraction = "check" | "type" | "select" | "dateTime";

export type FormValueSource<Key extends string = string> =
  | {
      kind: "submission";
      key: Key;
    }
  | {
      kind: "static";
      value: string | boolean;
    };

export type FormFieldDefinition<
  FieldKey extends string = string,
  PageId extends string = string
> = {
  key: FieldKey;
  label: string;
  type: FormFieldType;
  interaction: FormFieldInteraction;
  pageId: PageId;
  required: boolean;
  valueSource: FormValueSource<FieldKey>;
  options?: readonly string[];
  dependsOn?: {
    key: string;
    values: readonly string[];
  };
  locator?: {
    strategy: "question-label";
    label?: string;
  };
};

export type FormPageDefinition<
  PageId extends string = string,
  FieldKey extends string = string
> = {
  id: PageId;
  title: string;
  fields: readonly FieldKey[];
  transition: {
    action: "next" | "submit" | "none";
  };
};

export type FormBranchingDefinition<PageId extends string = string> = {
  selectorKey: string;
  pageByValue: Record<string, PageId | null>;
};

export type FormDefinition<
  FieldKey extends string = string,
  PageId extends string = string
> = {
  id: string;
  title: string;
  labels: Record<string, string>;
  buttons: {
    next: RegExp;
    submit: RegExp;
  };
  fields: Record<FieldKey, FormFieldDefinition<FieldKey, PageId>>;
  pages: Record<PageId, FormPageDefinition<PageId, FieldKey>>;
  branching: FormBranchingDefinition<PageId>;
  submitBehavior: {
    confirmationText: string;
    submitAnotherResponseText: string;
  };
  sessionValidationLabels: readonly string[];
  callStatus: {
    supportedOptions: readonly string[];
    randomPool: {
      value: string;
      label: string;
      options: readonly string[];
    };
  };
};
