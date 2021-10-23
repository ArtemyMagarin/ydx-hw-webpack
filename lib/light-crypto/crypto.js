import { v4 } from 'uuid';

/**
 * Generates random uuid v4 string
 * @return {string}
 */
const randomUUID = () => {
    return v4()
}

export default { randomUUID }
