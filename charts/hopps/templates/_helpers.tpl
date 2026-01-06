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
hoppsApp labels
*/}}
{{- define "hopps.hoppsAppLabels" -}}
{{ include "hopps.commonLabels" . }}
{{ include "hopps.hoppsAppSelectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
{{- end -}}
{{/*
hoppsApp selector labels
*/}}
{{- define "hopps.hoppsAppSelectorLabels" -}}
{{ include "hopps.commonSelectorLabels" . }}
app.kubernetes.io/name: {{ printf "%s-hopps-app" (include "hopps.name" .) }}
app.kubernetes.io/component: hopps-app
{{- end -}}
{{/*
hoppsApp name
*/}}
{{- define "hopps.hoppsAppName" -}}
{{- printf "%s-hopps-app" (include "hopps.name" .) -}}
{{- end -}}
{{/*
hoppsApp fully qualified name
*/}}
{{- define "hopps.hoppsAppFullname" -}}
{{- printf "%s-hopps-app" (include "hopps.fullname" .) -}}
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
