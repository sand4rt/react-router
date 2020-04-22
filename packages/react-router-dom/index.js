import * as React from 'react';
import PropTypes from 'prop-types';
import { createBrowserHistory, createHashHistory } from 'history';
import {
  // components
  MemoryRouter,
  Navigate,
  Outlet,
  Route,
  Router,
  Routes,
  // hooks
  useBlocker,
  useHref,
  useInRouterContext,
  useLocation,
  useLocationPending,
  useMatch,
  useNavigate,
  useOutlet,
  useParams,
  useResolvedLocation,
  useRoutes,
  // utils
  createRoutesFromChildren,
  matchRoutes,
  resolveLocation,
  generatePath
} from 'react-router';

function warning(cond, message) {
  if (!cond) {
    // eslint-disable-next-line no-console
    if (typeof console !== 'undefined') console.warn(message);

    try {
      throw new Error(message);
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }
}

////////////////////////////////////////////////////////////////////////////////
// RE-EXPORTS
////////////////////////////////////////////////////////////////////////////////

// Note: Keep in sync with react-router exports!
export {
  // components
  MemoryRouter,
  Navigate,
  Outlet,
  Route,
  Router,
  Routes,
  // hooks
  useBlocker,
  useHref,
  useInRouterContext,
  useLocation,
  useLocationPending,
  useMatch,
  useNavigate,
  useOutlet,
  useParams,
  useResolvedLocation,
  useRoutes,
  // utils
  createRoutesFromChildren,
  matchRoutes,
  resolveLocation,
  generatePath
};

////////////////////////////////////////////////////////////////////////////////
// COMPONENTS
////////////////////////////////////////////////////////////////////////////////

/**
 * A <Router> for use in web browsers. Provides the cleanest URLs.
 */
export function BrowserRouter({ children, timeout, window }) {
  let historyRef = React.useRef(null);

  if (historyRef.current == null) {
    historyRef.current = createBrowserHistory({ window });
  }

  return (
    <Router
      children={children}
      history={historyRef.current}
      timeout={timeout}
    />
  );
}

if (__DEV__) {
  BrowserRouter.displayName = 'BrowserRouter';
  BrowserRouter.propTypes = {
    children: PropTypes.node,
    timeout: PropTypes.number,
    window: PropTypes.object
  };
}

/**
 * A <Router> for use in web browsers. Stores the location in the hash
 * portion of the URL so it is not sent to the server.
 */
export function HashRouter({ children, timeout, window }) {
  let historyRef = React.useRef(null);

  if (historyRef.current == null) {
    historyRef.current = createHashHistory({ window });
  }

  return (
    <Router
      children={children}
      history={historyRef.current}
      timeout={timeout}
    />
  );
}

if (__DEV__) {
  HashRouter.displayName = 'HashRouter';
  HashRouter.propTypes = {
    children: PropTypes.node,
    timeout: PropTypes.number,
    window: PropTypes.object
  };
}

/**
 * The public API for rendering a history-aware <a>.
 */
export const Link = React.forwardRef(function LinkWithRef(
  {
    as: Component = 'a',
    onClick,
    replace: replaceProp = false,
    state,
    target,
    to,
    ...rest
  },
  ref
) {
  let href = useHref(to);
  let navigate = useNavigate();
  let location = useLocation();
  let toLocation = useResolvedLocation(to);

  function handleClick(event) {
    if (onClick) onClick(event);
    if (
      !event.defaultPrevented && // onClick prevented default
      event.button === 0 && // Ignore everything but left clicks
      (!target || target === '_self') && // Let browser handle "target=_blank" etc.
      !isModifiedEvent(event) // Ignore clicks with modifier keys
    ) {
      event.preventDefault();

      let isSameLocation =
        toLocation.pathname === location.pathname &&
        toLocation.search === location.search &&
        toLocation.hash === location.hash;

      // If the pathname, search, and hash haven't changed, a
      // regular <a> will do a REPLACE instead of a PUSH.
      let replace = !!replaceProp || isSameLocation;

      navigate(to, { replace, state });
    }
  }

  return (
    <Component
      {...rest}
      href={href}
      onClick={handleClick}
      ref={ref}
      target={target}
    />
  );
});

if (__DEV__) {
  Link.displayName = 'Link';
  Link.propTypes = {
    as: PropTypes.elementType,
    onClick: PropTypes.func,
    replace: PropTypes.bool,
    state: PropTypes.object,
    target: PropTypes.string,
    to: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        pathname: PropTypes.string,
        search: PropTypes.string,
        hash: PropTypes.string
      })
    ]).isRequired
  };
}

function isModifiedEvent(event) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}

/**
 * A <Link> wrapper that knows if it's "active" or not.
 */
export const NavLink = React.forwardRef(function NavLinkWithRef(
  {
    'aria-current': ariaCurrentProp = 'page',
    activeClassName = 'active',
    activeStyle = null,
    className: classNameProp = '',
    style: styleProp = null,
    to,
    ...rest
  },
  ref
) {
  let match = useMatch(to);
  let ariaCurrent = match ? ariaCurrentProp : undefined;
  let className = [classNameProp, match ? activeClassName : null]
    .filter(Boolean)
    .join(' ');
  let style = {
    ...styleProp,
    ...(match ? activeStyle : null)
  };

  return (
    <Link
      {...rest}
      aria-current={ariaCurrent}
      className={className}
      ref={ref}
      style={style}
      to={to}
    />
  );
});

if (__DEV__) {
  NavLink.displayName = 'NavLink';
  NavLink.propTypes = {
    ...Link.propTypes,
    'aria-current': PropTypes.oneOf([
      'page',
      'step',
      'location',
      'date',
      'time',
      'true'
    ]),
    activeClassName: PropTypes.string,
    activeStyle: PropTypes.object,
    className: PropTypes.string,
    style: PropTypes.object,
    to: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        pathname: PropTypes.string,
        search: PropTypes.string,
        hash: PropTypes.string
      })
    ]).isRequired
  };
}

/**
 * A declarative interface for showing a window.confirm dialog with the given
 * message when the user tries to navigate away from the current page.
 *
 * This also serves as a reference implementation for anyone who wants to
 * create their own custom prompt component.
 */
export function Prompt({ message, when }) {
  usePrompt(message, when);
  return null;
}

if (__DEV__) {
  Prompt.displayName = 'Prompt';
  Prompt.propTypes = {
    message: PropTypes.string,
    when: PropTypes.bool
  };
}

////////////////////////////////////////////////////////////////////////////////
// HOOKS
////////////////////////////////////////////////////////////////////////////////

/**
 * Prevents navigation away from the current page using a window.confirm prompt
 * with the given message.
 */
export function usePrompt(message, when) {
  let blocker = React.useCallback(
    tx => {
      if (window.confirm(message)) tx.retry();
    },
    [message]
  );

  useBlocker(blocker, when);
}

/**
 * A convenient wrapper for accessing individual query parameters via the
 * URLSearchParams interface.
 */
export function useSearchParams(defaultInit) {
  warning(
    typeof URLSearchParams !== 'undefined',
    'You cannot use the `useSearchParams` hook in a browser that does not' +
      ' support the URLSearchParams API. If you need to support Internet Explorer 11,' +
      ' we recommend you load a polyfill such as https://github.com/ungap/url-search-params' +
      '\n\n' +
      "If you're unsure how to load polyfills, we recommend you check out https://polyfill.io/v3/" +
      ' which provides some recommendations about how to load polyfills only for users that' +
      ' need them, instead of for every user.'
  );

  let defaultSearchParamsRef = React.useRef(createSearchParams(defaultInit));

  let location = useLocation();
  let searchParams = React.useMemo(() => {
    let searchParams = createSearchParams(location.search);

    for (let key of defaultSearchParamsRef.current.keys()) {
      if (!searchParams.has(key)) {
        defaultSearchParamsRef.current.getAll(key).forEach(value => {
          searchParams.append(key, value);
        });
      }
    }

    return searchParams;
  }, [location.search]);

  let navigate = useNavigate();
  let setSearchParams = React.useCallback(
    (nextInit, navigateOpts) => {
      navigate('?' + createSearchParams(nextInit), navigateOpts);
    },
    [navigate]
  );

  return [searchParams, setSearchParams];
}

/**
 * Creates a URLSearchParams object using the given initializer.
 *
 * This is identical to `new URLSearchParams(init)` except it also
 * supports arrays as values in the object form of the initializer
 * instead of just strings. This is convenient when you need multiple
 * values for a given key, but don't want to use an array initializer.
 *
 * For example, instead of:
 *
 *   let searchParams = new URLSearchParams([
 *     ['sort', 'name'],
 *     ['sort', 'price']
 *   ]);
 *
 * you can do:
 *
 *   let searchParams = createSearchParams({
 *     sort: ['name', 'price']
 *   });
 */
export function createSearchParams(init = '') {
  if (
    typeof init !== 'string' &&
    !Array.isArray(init) &&
    !(init instanceof URLSearchParams)
  ) {
    init = Object.keys(init).reduce((memo, key) => {
      let value = init[key];
      if (Array.isArray(value)) {
        value.forEach(v => memo.push([key, v]));
      } else {
        memo.push([key, value]);
      }
      return memo;
    }, []);
  }

  return new URLSearchParams(init);
}