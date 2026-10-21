import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { toHaveNoViolations } from 'jest-axe'
import { afterEach, expect } from 'vitest'

import '../i18n'

expect.extend(toHaveNoViolations)
afterEach(cleanup)
