export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface PmResponseMock {
  json: () => any;
  text: () => string;
  status: number;
  to: {
    have: {
      status: (code: number) => void;
    }
  };
}

export interface SandboxContext {
  environment: {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
  };
  variables: {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
  };
  response?: PmResponseMock;
  test: (name: string, fn: () => void) => void;
}

export function createSandboxContext(
  envVars: Record<string, string>,
  setEnvVar: (key: string, value: string) => void,
  responseObj?: any,
  onTestResult?: (result: TestResult) => void
): SandboxContext {
  
  const ctx: SandboxContext = {
    environment: {
      get: (key: string) => envVars[key] || null,
      set: (key: string, value: any) => setEnvVar(key, String(value))
    },
    variables: {
      get: (key: string) => envVars[key] || null,
      set: (key: string, value: any) => setEnvVar(key, String(value))
    },
    test: (name: string, fn: () => void) => {
      try {
        fn();
        if (onTestResult) onTestResult({ name, passed: true });
      } catch (e: any) {
        if (onTestResult) onTestResult({ name, passed: false, error: e.message || String(e) });
      }
    }
  };

  if (responseObj) {
    ctx.response = {
      status: responseObj.status_code || 200,
      json: () => {
        if (typeof responseObj.data === 'string') return JSON.parse(responseObj.data);
        return responseObj.data;
      },
      text: () => {
        if (typeof responseObj.data === 'string') return responseObj.data;
        return JSON.stringify(responseObj.data);
      },
      to: {
        have: {
          status: (code: number) => {
            if (responseObj.status_code !== code) {
              throw new Error(`Expected status to have code ${code} but got ${responseObj.status_code}`);
            }
          }
        }
      }
    };
  }

  return ctx;
}

export function executeScript(script: string, context: SandboxContext) {
  if (!script || !script.trim()) return;
  try {
    const fn = new Function('pm', script);
    fn(context);
  } catch (err: any) {
    console.error("Script Execution Error:", err);
    throw err;
  }
}
