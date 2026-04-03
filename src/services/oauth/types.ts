/**
 * Stub type definitions for OAuth types.
 */

export type SubscriptionType = string | null

export type RateLimitTier = string | null

export type BillingType = string

export type ReferralCampaign = string

export interface OAuthProfileResponse {
  [key: string]: any
}

export interface OAuthTokenExchangeResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  scope?: string
  account?: {
    uuid: string
    email_address: string
    [key: string]: any
  }
  organization?: {
    uuid: string
    [key: string]: any
  }
  [key: string]: any
}

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  scopes: string[]
  subscriptionType: SubscriptionType
  rateLimitTier?: RateLimitTier
  profile?: OAuthProfileResponse
  tokenAccount?: {
    uuid: string
    emailAddress: string
    organizationUuid?: string
  }
  [key: string]: any
}

export interface UserRolesResponse {
  [key: string]: any
}

export interface OrgValidationResult {
  valid: boolean
  message?: string
  [key: string]: any
}

export interface ReferrerRewardInfo {
  currency: string
  amount_minor_units: number
  [key: string]: any
}

export interface ReferralRedemptionsResponse {
  [key: string]: any
}

export interface ReferralEligibilityResponse {
  [key: string]: any
}
