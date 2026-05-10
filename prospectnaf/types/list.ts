export interface ListSummary {
  id: string
  name: string
  companyCount: number
  createdAt: string
  updatedAt: string
}

export interface ListDetail {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  companies: import('./company').ListCompanyWithData[]
}

export interface AddCompaniesResult {
  added: number
  alreadyPresent: number
  limitReached: boolean
}
