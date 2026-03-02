@description('Name of the container app')
param name string

param location string
param tags object
param resourceToken string
param tenantId string
param authClientId string
param storageAccountName string

var abbrs = loadJsonContent('../abbreviations.json')

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${abbrs.logAnalyticsWorkspace}${resourceToken}'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

// Container Registry
resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: '${abbrs.containerRegistry}${resourceToken}'
  location: location
  tags: tags
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: true }
}

// Container Apps Environment
resource containerAppsEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${abbrs.containerAppsEnvironment}${resourceToken}'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Container App
resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${abbrs.containerApp}${name}'
  location: location
  tags: union(tags, { 'azd-service-name': 'web' })
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
      ]
    }
    template: {
      containers: [
        {
          name: name
          image: '${acr.properties.loginServer}/${name}:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'AZURE_TENANT_ID', value: tenantId }
            { name: 'AZURE_CLIENT_ID', value: authClientId }
            { name: 'AZURE_STORAGE_ACCOUNT_NAME', value: storageAccountName }
            { name: 'REPORTS_CONTAINER', value: 'reports' }
            { name: 'PORT', value: '8080' }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
        rules: [
          {
            name: 'http-rule'
            http: { metadata: { concurrentRequests: '50' } }
          }
        ]
      }
    }
  }
}

// Grant the container app's managed identity access to storage
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

var storageBlobDataContributorRole = '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3' // Storage Blob Data Contributor

resource storageRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerApp.id, storageAccount.id, storageBlobDataContributorRole)
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributorRole)
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output fqdn string = containerApp.properties.configuration.ingress.fqdn
output name string = containerApp.name
output identityPrincipalId string = containerApp.identity.principalId
