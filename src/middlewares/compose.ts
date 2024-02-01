import { type ProvideData } from "../providers/provider"
import { Middleware, IdentityMiddleware } from "./middleware"
import { type MiddlewareRegistry } from "./registry"

/**
 * Gets the intersection of the acceptedType field which may be 'all'
 * ['all', 'all', 'all'] -> 'all'
 * ['all', ['a', 'b'], ['b', 'c']] -> ['b']
 */
function getIntersectionOfAcceptedTypes(children: Middleware[]) {
  if (children.length === 0) return []
  if (children.length === 1) return children[0].acceptedTypes
  const firstTypes = children[0].acceptedTypes
  let intersection: Set<string> | 'all' = firstTypes === 'all' ? 'all' : new Set(firstTypes)
  for (const child of children) {
    if (child.acceptedTypes === 'all') continue;
    if (intersection === 'all') {
      intersection = new Set(child.acceptedTypes)
    } else {
      const nextIntersection = new Set<string>()
      for (const acceptedType of child.acceptedTypes) {
        if (intersection.has(acceptedType)) {
          nextIntersection.add(acceptedType)
        }
      }
      intersection = nextIntersection
    }
  }
  return intersection === 'all' ? 'all' : [...intersection]
}

/**
 * Represents multiple middleware in linear order. Determines the intersection of the
 * accepted packet types to filter, and runs .process on the children to skip their checks.
 */
export class ComposedMiddleware extends Middleware {
  type = 'composed'
  children: Middleware[]
  
  constructor(args: { children: Middleware[] }) {
    super(args)
    this.children = args.children
    this.acceptedTypes = getIntersectionOfAcceptedTypes(this.children)
  }

  process(data: ProvideData): ProvideData | null {
    let _data: ProvideData | null = data
    for (const middleware of this.children) {
      _data = middleware.process(_data)
      if (_data === null) return null
    }
    return _data
  }
}

/** If the input is a string, looks up the registered middleware under that name */
function resolveMiddleware(registry: MiddlewareRegistry, middlewareOrRegistryName: Middleware | string) {
  if (typeof middlewareOrRegistryName === 'string') {
    return registry.get(middlewareOrRegistryName)
  } else {
    return middlewareOrRegistryName
  }
}

/** 
 * Dynamically resolved registry items when running the middleware.
 * As a result, we set acceptedTypes to all and let the middleware determine the rules dynamically.
 */
export class ComposedWithRegisteredItemsMiddleware extends Middleware {
  type = 'composed-with-registered-items'
  children: (Middleware | string)[]
  private registry: MiddlewareRegistry
  
  constructor(args: { children: (Middleware | string)[], registry: MiddlewareRegistry }) {
    super(args)
    this.children = args.children
    this.registry = args.registry
  }

  process(data: ProvideData): ProvideData | null {
    let _data: ProvideData | null = data
    for (const middlewareOrRegistryName of this.children) {
      const resolvedMiddleware = resolveMiddleware(this.registry, middlewareOrRegistryName)
      _data = resolvedMiddleware.run(_data)
      if (_data === null) return null
    }
    return _data
  }
}

export function compose(...middlewares: Middleware[]) {
  if (middlewares.length === 0) return new IdentityMiddleware({})
  if (middlewares.length === 1) return middlewares[0]
  return new ComposedMiddleware({ children: middlewares })
}

export function composeWithRegistry(registry: MiddlewareRegistry, ...middlewareOrRegistryNameItems: (Middleware | string)[]) {
  if (middlewareOrRegistryNameItems.length === 0) {
    return new IdentityMiddleware({})
  }
  if (middlewareOrRegistryNameItems.length === 1) {
    return resolveMiddleware(registry, middlewareOrRegistryNameItems[0])
  }
  return new ComposedWithRegisteredItemsMiddleware({
    children: middlewareOrRegistryNameItems,
    registry,
  })
}
