import { useNoBail } from './no-bail';

useNoBail();

afterEach(() => {
  vi.resetAllMocks();
});
