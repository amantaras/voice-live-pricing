targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment (e.g., dev, prod)')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Azure AD tenant ID')
param tenantId string = tenant().tenantId

@description('Azure AD client ID for the app registration (set after manual registration)')
param authClientId string = ''

param containerAppName string = 'voice-live-pricing'

var abbrs = loadJsonContent('abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = { 'azd-env-name': environmentName }

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: '${abbrs.resourceGroup}${environmentName}'
  location: location
  tags: tags
}

// Container Apps Environment + App
module app 'modules/container-app.bicep' = {
  name: 'container-app'
  scope: rg
  params: {
    name: containerAppName
    location: location
    tags: tags
    resourceToken: resourceToken
    tenantId: tenantId
    authClientId: authClientId
    storageAccountName: storage.outputs.storageAccountName
  }
}

// Storage Account for reports
module storage 'modules/storage.bicep' = {
  name: 'storage'
  scope: rg
  params: {
    location: location
    tags: tags
    resourceToken: resourceToken
  }
}

output AZURE_CONTAINER_APP_FQDN string = app.outputs.fqdn
output AZURE_CONTAINER_APP_NAME string = app.outputs.name
output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_STORAGE_ACCOUNT_NAME string = storage.outputs.storageAccountName
output AZURE_TENANT_ID string = tenantId
output AZURE_CLIENT_ID string = authClientId
