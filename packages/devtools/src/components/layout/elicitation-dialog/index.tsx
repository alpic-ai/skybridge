import { Button } from "@alpic-ai/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@alpic-ai/ui/components/dialog";
import { Form } from "@rjsf/shadcn";
import { useMemo } from "react";
import { formTemplates } from "@/components/layout/tools-list/form/index.js";
import {
  type PendingElicitation,
  useElicitationStore,
} from "@/lib/elicitation-store.js";
import { validator } from "@/lib/schema-validator.js";
import { getRequestedSchema, toContent, toFormSchema } from "./schema.js";
import { elicitationWidgets } from "./widgets.js";

export function ElicitationDialog() {
  const pending = useElicitationStore((s) => s.pending);
  return (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) {
          pending?.respond({ action: "cancel" });
        }
      }}
    >
      {pending && (
        <ElicitationForm params={pending.params} respond={pending.respond} />
      )}
    </Dialog>
  );
}

function ElicitationForm({ params, respond }: PendingElicitation) {
  const { schema, uiSchema } = useMemo(
    () => toFormSchema(getRequestedSchema(params)),
    [params],
  );

  return (
    <DialogContent size="lg">
      <DialogHeader>
        <DialogTitle>Form request</DialogTitle>
        <DialogDescription>{params.message}</DialogDescription>
      </DialogHeader>
      <Form
        schema={schema}
        uiSchema={uiSchema}
        validator={validator}
        widgets={elicitationWidgets}
        templates={formTemplates}
        showErrorList={false}
        experimental_defaultFormStateBehavior={{ constAsDefaults: "never" }}
        className="max-h-[60vh] overflow-y-auto"
        onSubmit={({ formData }) =>
          respond({ action: "accept", content: toContent(schema, formData) })
        }
      >
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => respond({ action: "decline" })}
          >
            Decline
          </Button>
          <Button type="submit">Submit</Button>
        </DialogFooter>
      </Form>
    </DialogContent>
  );
}
