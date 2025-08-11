import { ProductSpecification } from '../services/products'

export interface ValidationResult {
  isValid: boolean
  message?: string
  range?: string
}

// Map test parameter keys to product specification properties
export const TEST_PARAM_TO_SPEC_MAP: Record<string, string> = {
  // G1 Machine tests
  'hardness': 'Hardness',
  'density': 'Specific Gravity', 
  
  // G2 Machine tests - All TS values map to Tear Strength
  'ts1': 'Tear Strength',
  'ts2': 'Tear Strength', 
  'ts3': 'Tear Strength',
  'ts4': 'Tear Strength',
  
  // G2 Machine tests - All Elongation values map to Elongation
  'elongation1': 'Elongation',
  'elongation2': 'Elongation',
  'elongation3': 'Elongation', 
  'elongation4': 'Elongation',
  
  // G2 Machine tests - Tear Strength (this is the old key, keeping for compatibility)
  'tearStrength': 'Tear Strength',
  
  // G3 Machine tests
  'mooneyViscosity': 'Mooney Viscosity',
  
  // Rheo tests - Note: We validate the converted seconds values, not the input minutes
  'rheoTS2Sec': 'Rheo (TS2)', // Validate the converted seconds value
  'rheoTC90Sec': 'Rheo (TC90)', // Validate the converted seconds value
  
  // Legacy mappings (keeping for backward compatibility)
  'tensileStrength': 'Tensile Strength',
  'elongation': 'Elongation'
}

// Parse specification range string (e.g., "68±7", "1.5-1.6", ">4", "<10", "15-25")
export function parseSpecificationRange(specification: string): {
  min?: number
  max?: number
  target?: number
  tolerance?: number
  type: 'range' | 'tolerance' | 'minimum' | 'maximum' | 'exact'
} {
  const spec = specification.trim()
  
  // Handle tolerance format (e.g., "68±7")
  if (spec.includes('±')) {
    const [targetStr, toleranceStr] = spec.split('±')
    const target = parseFloat(targetStr || '0')
    const tolerance = parseFloat(toleranceStr || '0')
    return {
      target,
      tolerance,
      min: target - tolerance,
      max: target + tolerance,
      type: 'tolerance'
    }
  }
  
  // Handle range format (e.g., "1.5-1.6", "15-25")
  if (spec.includes('-') && !spec.startsWith('-')) {
    const [minStr, maxStr] = spec.split('-')
    const min = parseFloat(minStr || '0')
    const max = parseFloat(maxStr || '0')
    return {
      min,
      max,
      type: 'range'
    }
  }
  
  // Handle minimum format (e.g., ">4", "≥4")
  if (spec.startsWith('>') || spec.startsWith('≥')) {
    const value = parseFloat(spec.substring(1))
    return {
      min: value,
      type: 'minimum'
    }
  }
  
  // Handle maximum format (e.g., "<10", "≤10")
  if (spec.startsWith('<') || spec.startsWith('≤')) {
    const value = parseFloat(spec.substring(1))
    return {
      max: value,
      type: 'maximum'
    }
  }
  
  // Handle exact value
  const exactValue = parseFloat(spec)
  if (!isNaN(exactValue)) {
    return {
      target: exactValue,
      min: exactValue,
      max: exactValue,
      type: 'exact'
    }
  }
  
  // If we can't parse it, return empty
  return { type: 'range' }
}

// Validate a test value against product specification
export function validateTestValue(
  testParamKey: string, 
  value: number, 
  productSpecs: ProductSpecification[]
): ValidationResult {
  // Find the corresponding specification
  const specProperty = TEST_PARAM_TO_SPEC_MAP[testParamKey]
  if (!specProperty) {
    return { isValid: true } // If no mapping, assume valid
  }
  
  // Try to find the spec by exact match first
  let spec = productSpecs.find(s => s.property === specProperty)
  
  // If not found and it's Mooney Viscosity, try alternative property names
  if (!spec && testParamKey === 'mooneyViscosity') {
    spec = productSpecs.find(s => 
      s.property.toLowerCase().includes('mooney') || 
      s.property.toLowerCase().includes('viscosity') ||
      s.property === 'Mooney' ||
      s.property === 'Viscosity'
    )
  }
  
  if (!spec) {
    return { isValid: true } // If no spec found, assume valid
  }
  
  const range = parseSpecificationRange(spec.specification)
  const rangeText = spec.specification
  
  // Validate based on range type
  switch (range.type) {
    case 'tolerance':
      if (range.min !== undefined && range.max !== undefined) {
        const isValid = value >= range.min && value <= range.max
        return {
          isValid,
          range: rangeText,
          message: isValid ? undefined : `Value must be between ${range.min} and ${range.max}`
        }
      }
      break
      
    case 'range':
      if (range.min !== undefined && range.max !== undefined) {
        const isValid = value >= range.min && value <= range.max
        return {
          isValid,
          range: rangeText,
          message: isValid ? undefined : `Value must be between ${range.min} and ${range.max}`
        }
      }
      break
      
    case 'minimum':
      if (range.min !== undefined) {
        const isValid = value >= range.min
        return {
          isValid,
          range: rangeText,
          message: isValid ? undefined : `Value must be at least ${range.min}`
        }
      }
      break
      
    case 'maximum':
      if (range.max !== undefined) {
        const isValid = value <= range.max
        return {
          isValid,
          range: rangeText,
          message: isValid ? undefined : `Value must be at most ${range.max}`
        }
      }
      break
      
    case 'exact':
      if (range.target !== undefined) {
        const isValid = Math.abs(value - range.target) < 0.001 // Allow small floating point differences
        return {
          isValid,
          range: rangeText,
          message: isValid ? undefined : `Value must be exactly ${range.target}`
        }
      }
      break
  }
  
  return { 
    isValid: true, 
    range: rangeText 
  }
}

// Get range display text for a test parameter
export function getRangeDisplay(testParamKey: string, productSpecs: ProductSpecification[]): string | null {
  let specProperty = TEST_PARAM_TO_SPEC_MAP[testParamKey]
  
  // Special handling for Rheo minute inputs - don't show range text (too long)
  if (testParamKey === 'rheoTS2Min' || testParamKey === 'rheoTC90Min') {
    return null // Don't show range text for Rheo minute inputs
  }
  
  if (!specProperty) return null
  
  // Try to find the spec by exact match first
  let spec = productSpecs.find(s => s.property === specProperty)
  
  // If not found and it's Mooney Viscosity, try alternative property names
  if (!spec && testParamKey === 'mooneyViscosity') {
    spec = productSpecs.find(s => 
      s.property.toLowerCase().includes('mooney') || 
      s.property.toLowerCase().includes('viscosity') ||
      s.property === 'Mooney' ||
      s.property === 'Viscosity'
    )
  }
  
  if (!spec) return null
  
  return `Range: ${spec.specification} ${spec.unit || ''}`
}

// Check if any test values are out of range
export function hasOutOfRangeValues(
  testValues: Record<string, number>, 
  productSpecs: ProductSpecification[]
): boolean {
  for (const [key, value] of Object.entries(testValues)) {
    if (value !== undefined && value !== null && value !== 0) {
      const validation = validateTestValue(key, value, productSpecs)
      if (!validation.isValid) {
        return true
      }
    }
  }
  return false
}

