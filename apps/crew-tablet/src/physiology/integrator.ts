/**
 * NUMERICAL INTEGRATION METHODS FOR PHYSIOLOGICAL ODEs
 * 
 * Provides 4th-Order Runge-Kutta (RK4) and Clamped Euler solvers
 * with sub-stepping for stiff and non-linear compartmental physiological systems.
 */

export type DerivativeFunction = (t: number, y: number[]) => number[];

export interface IntegrationBounds {
  min?: number;
  max?: number;
}

/**
 * 4th-Order Runge-Kutta integration step (RK4)
 * Provides O(h^4) global error accuracy.
 */
export function rk4Step(
  f: DerivativeFunction,
  t: number,
  y: number[],
  h: number,
  bounds?: (IntegrationBounds | undefined)[]
): number[] {
  const n = y.length;
  
  // k1 = f(t, y)
  const k1 = f(t, y);
  
  // y_temp2 = y + 0.5 * h * k1
  const y2 = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    y2[i] = y[i]! + 0.5 * h * k1[i]!;
  }
  const k2 = f(t + 0.5 * h, y2);
  
  // y_temp3 = y + 0.5 * h * k2
  const y3 = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    y3[i] = y[i]! + 0.5 * h * k2[i]!;
  }
  const k3 = f(t + 0.5 * h, y3);
  
  // y_temp4 = y + h * k3
  const y4 = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    y4[i] = y[i]! + h * k3[i]!;
  }
  const k4 = f(t + h, y4);
  
  // y_next = y + (h / 6) * (k1 + 2*k2 + 2*k3 + k4)
  const nextY = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let val = y[i]! + (h / 6.0) * (k1[i]! + 2.0 * k2[i]! + 2.0 * k3[i]! + k4[i]!);
    
    // Apply physiological boundary clamping if specified
    if (bounds && bounds[i]) {
      const b = bounds[i]!;
      if (b.min !== undefined && val < b.min) val = b.min;
      if (b.max !== undefined && val > b.max) val = b.max;
    }
    nextY[i] = val;
  }
  
  return nextY;
}

/**
 * Forward Euler integration with physiological clamping.
 * Useful for fast discrete relaxation updates.
 */
export function eulerStep(
  f: DerivativeFunction,
  t: number,
  y: number[],
  h: number,
  bounds?: (IntegrationBounds | undefined)[]
): number[] {
  const n = y.length;
  const dydt = f(t, y);
  const nextY = new Array<number>(n);
  
  for (let i = 0; i < n; i++) {
    let val = y[i]! + h * dydt[i]!;
    if (bounds && bounds[i]) {
      const b = bounds[i]!;
      if (b.min !== undefined && val < b.min) val = b.min;
      if (b.max !== undefined && val > b.max) val = b.max;
    }
    nextY[i] = val;
  }
  
  return nextY;
}

/**
 * Multi-step integrator: advances state y from t to t + dt using sub-steps.
 */
export function integrate(
  f: DerivativeFunction,
  t: number,
  y: number[],
  dt: number,
  method: "rk4" | "euler" = "rk4",
  subSteps: number = 4,
  bounds?: (IntegrationBounds | undefined)[]
): number[] {
  const stepSize = dt / Math.max(1, subSteps);
  let currentY = [...y];
  let currentTime = t;
  
  for (let s = 0; s < subSteps; s++) {
    if (method === "rk4") {
      currentY = rk4Step(f, currentTime, currentY, stepSize, bounds);
    } else {
      currentY = eulerStep(f, currentTime, currentY, stepSize, bounds);
    }
    currentTime += stepSize;
  }
  
  return currentY;
}
