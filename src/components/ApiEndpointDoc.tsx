import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { ApiEndpointDoc } from "@/lib/apiDocs";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30",
  POST: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  PUT: "bg-amber-500/20 text-amber-700 border-amber-500/30",
  PATCH: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  DELETE: "bg-red-500/20 text-red-700 border-red-500/30",
};

interface ApiEndpointDocProps {
  endpoint: ApiEndpointDoc;
  baseUrl: string;
}

export function ApiEndpointDoc({ endpoint, baseUrl }: ApiEndpointDocProps) {
  const [open, setOpen] = useState(false);
  const fullUrl = `${baseUrl.replace(/\/$/, "")}${endpoint.path}`;
  const methodColor = METHOD_COLORS[endpoint.method] ?? "bg-muted text-muted-foreground";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card">
        <CollapsibleTrigger className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors rounded-lg">
          <ChevronRight
            className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          />
          <Badge variant="outline" className={`font-mono ${methodColor}`}>
            {endpoint.method}
          </Badge>
          <span className="font-medium text-sm flex-1">{endpoint.summary}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t">
            <div className="pt-4">
              <p className="text-sm text-muted-foreground mb-2">
                {endpoint.description ?? endpoint.summary}
              </p>
              <div className="rounded-md bg-muted/50 p-3 font-mono text-xs break-all">
                {fullUrl}
              </div>
            </div>

            {(endpoint.queryParams?.length ?? 0) > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Query parameters
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-1.5 pr-2 font-medium">Nome</th>
                        <th className="py-1.5 pr-2 font-medium">Tipo</th>
                        <th className="py-1.5 pr-2 font-medium">Obrigatório</th>
                        <th className="py-1.5 font-medium">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {endpoint.queryParams!.map((p) => (
                        <tr key={p.name} className="border-b last:border-0">
                          <td className="py-1.5 pr-2 font-mono text-xs">{p.name}</td>
                          <td className="py-1.5 pr-2 text-muted-foreground text-xs">{p.type}</td>
                          <td className="py-1.5 pr-2 text-xs">{p.required ? "Sim" : "Não"}</td>
                          <td className="py-1.5 text-muted-foreground text-xs">{p.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(endpoint.bodyParams?.length ?? 0) > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Body parameters
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-1.5 pr-2 font-medium">Nome</th>
                        <th className="py-1.5 pr-2 font-medium">Tipo</th>
                        <th className="py-1.5 pr-2 font-medium">Obrigatório</th>
                        <th className="py-1.5 font-medium">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {endpoint.bodyParams!.map((p) => (
                        <tr key={p.name} className="border-b last:border-0">
                          <td className="py-1.5 pr-2 font-mono text-xs">{p.name}</td>
                          <td className="py-1.5 pr-2 text-muted-foreground text-xs">{p.type}</td>
                          <td className="py-1.5 pr-2 text-xs">{p.required ? "Sim" : "Não"}</td>
                          <td className="py-1.5 text-muted-foreground text-xs">{p.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {endpoint.requestExample && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Exemplo de request
                </h4>
                <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">
                  <code>{endpoint.requestExample}</code>
                </pre>
              </div>
            )}

            {endpoint.responseExample && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Exemplo de response
                </h4>
                <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">
                  <code>{endpoint.responseExample}</code>
                </pre>
              </div>
            )}

            {(endpoint.responseCodes?.length ?? 0) > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Códigos de resposta
                </h4>
                <ul className="space-y-1 text-sm">
                  {endpoint.responseCodes!.map((r) => (
                    <li key={r.code} className="flex gap-2">
                      <span className="font-mono font-medium w-12">{r.code}</span>
                      <span className="text-muted-foreground">{r.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground pt-2">
              Autenticação: envie o token no header{" "}
              <code className="bg-muted px-1 rounded">X-API-Key</code> ou{" "}
              <code className="bg-muted px-1 rounded">Authorization: Bearer &lt;token&gt;</code>
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
