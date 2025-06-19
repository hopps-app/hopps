{{/*
Expand the name of the chart.
*/}}
{{- define "hopps.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "hopps.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "hopps.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "hopps.labels" -}}
helm.sh/chart: {{ include "hopps.chart" . }}
{{ include "hopps.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "hopps.selectorLabels" -}}
app.kubernetes.io/name: {{ include "hopps.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "hopps.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "hopps.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}


{{/*
Common labels
*/}}
{{- define "hopps.commonLabels" -}}
helm.sh/chart: {{ include "hopps.chart" . }}
app.kubernetes.io/part-of: {{ include "hopps.name" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Common selector labels
*/}}
{{- define "hopps.commonSelectorLabels" -}}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}


{{/*
azDocumentAi labels
*/}}
{{- define "hopps.azDocumentAiLabels" -}}
{{ include "hopps.commonLabels" . }}
{{ include "hopps.azDocumentAiSelectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
{{- end -}}
{{/*
azDocumentAi selector labels
*/}}
{{- define "hopps.azDocumentAiSelectorLabels" -}}
{{ include "hopps.commonSelectorLabels" . }}
app.kubernetes.io/name: {{ printf "%s-az-document-ai" (include "hopps.name" .) }}
app.kubernetes.io/component: az-document-ai
{{- end -}}
{{/*
azDocumentAi name
*/}}
{{- define "hopps.azDocumentAiName" -}}
{{- printf "%s-az-document-ai" (include "hopps.name" .) -}}
{{- end -}}
{{/*
azDocumentAi fully qualified name
*/}}
{{- define "hopps.azDocumentAiFullname" -}}
{{- printf "%s-az-document-ai" (include "hopps.fullname" .) -}}
{{- end -}}


{{/*
org labels
*/}}
{{- define "hopps.orgLabels" -}}
{{ include "hopps.commonLabels" . }}
{{ include "hopps.orgSelectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
{{- end -}}
{{/*
org selector labels
*/}}
{{- define "hopps.orgSelectorLabels" -}}
{{ include "hopps.commonSelectorLabels" . }}
app.kubernetes.io/name: {{ printf "%s-org" (include "hopps.name" .) }}
app.kubernetes.io/component: org
{{- end -}}
{{/*
org name
*/}}
{{- define "hopps.orgName" -}}
{{- printf "%s-org" (include "hopps.name" .) -}}
{{- end -}}
{{/*
org fully qualified name
*/}}
{{- define "hopps.orgFullname" -}}
{{- printf "%s-org" (include "hopps.fullname" .) -}}
{{- end -}}

{{/*
fin-narrator labels
*/}}
{{- define "hopps.finNarratorLabels" -}}
{{ include "hopps.commonLabels" . }}
{{ include "hopps.finNarratorSelectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
{{- end -}}
{{/*
fin selector labels
*/}}
{{- define "hopps.finNarratorSelectorLabels" -}}
{{ include "hopps.commonSelectorLabels" . }}
app.kubernetes.io/name: {{ printf "%s-fin-narrator" (include "hopps.name" .) }}
app.kubernetes.io/component: fin-narrator
{{- end -}}
{{/*
fin name
*/}}
{{- define "hopps.finNarratorName" -}}
{{- printf "%s-fin-narrator" (include "hopps.name" .) -}}
{{- end -}}
{{/*
fin fully qualified name
*/}}
{{- define "hopps.finNarratorFullname" -}}
{{- printf "%s-fin-narrator" (include "hopps.fullname" .) -}}
{{- end -}}

{{/*
frontend labels
*/}}
{{- define "hopps.frontendLabels" -}}
{{ include "hopps.commonLabels" . }}
{{ include "hopps.frontendSelectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
{{- end -}}
{{/*
frontend selector labels
*/}}
{{- define "hopps.frontendSelectorLabels" -}}
{{ include "hopps.commonSelectorLabels" . }}
app.kubernetes.io/name: {{ printf "%s-frontend" (include "hopps.name" .) }}
app.kubernetes.io/component: frontend
{{- end -}}
{{/*
frontend name
*/}}
{{- define "hopps.frontendName" -}}
{{- printf "%s-frontend" (include "hopps.name" .) -}}
{{- end -}}
{{/*
frontend fully qualified name
*/}}
{{- define "hopps.frontendFullname" -}}
{{- printf "%s-frontend" (include "hopps.fullname" .) -}}
{{- end -}}

{{/*
zugferd labels
*/}}
{{- define "hopps.zugferdLabels" -}}
{{ include "hopps.commonLabels" . }}
{{ include "hopps.zugferdSelectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
{{- end -}}
{{/*
zugferd selector labels
*/}}
{{- define "hopps.zugferdSelectorLabels" -}}
{{ include "hopps.commonSelectorLabels" . }}
app.kubernetes.io/name: {{ printf "%s-zugferd" (include "hopps.name" .) }}
app.kubernetes.io/component: zugferd
{{- end -}}
{{/*
zugferd name
*/}}
{{- define "hopps.zugferdName" -}}
{{- printf "%s-zugferd" (include "hopps.name" .) -}}
{{- end -}}
{{/*
zugferd fully qualified name
*/}}
{{- define "hopps.zugferdFullname" -}}
{{- printf "%s-zugferd" (include "hopps.fullname" .) -}}
{{- end -}}
