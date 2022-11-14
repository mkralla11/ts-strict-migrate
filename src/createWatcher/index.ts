import { FSWatcher, watch } from 'chokidar';
import { EventEmitter } from 'node:events';

interface HandleWatchArguments {
  files?: string[]
  watchEnabled: boolean
  watcher: Watcher
}

type HandleUnwatchArguments = HandleWatchArguments

export function handleUnwatch({ files, watchEnabled, watcher }: HandleUnwatchArguments): void {
  watchEnabled && files && watcher.unwatchFiles(files);
}

export function handleWatch({ files, watchEnabled, watcher }: HandleWatchArguments): void {
  watchEnabled && files && watcher.watchFiles(files);
}

type watchUnwatchFunction = (files: string[])=>void

interface EventMap {
  all: (event:string, path: string)=>void;
  add: (path: string) => void;
  change: (path: string) => void;
  unlink: (path: string) => void;
  addDir: (path: string) => void;
  unlinkDir: (path: string) => void;
  error: (error: Error) => void;
  ready: () => void;
  raw: (event:string, path:string) => void;
}

interface EventsBase {
  // matches EventEmitter.on
  on<U extends keyof EventMap>(event: U, listener: EventMap[U]): this;

  // matches EventEmitter.off
  off<U extends keyof EventMap>(event: U, listener: EventMap[U]): this;

  // matches EventEmitter.emit
  emit<U extends keyof EventMap>(
      event: U,
      ...arguments_: Parameters<EventMap[U]>
  ): void;
}

type publicEmitterFunctionMap = Pick<EventsBase, 'on' | 'off'>

export interface Watcher extends publicEmitterFunctionMap {
  init: ()=>void
  close: ()=>Promise<void>
  unwatchFiles: watchUnwatchFunction
  watchFiles: watchUnwatchFunction
}

export interface WatcherOptions {
  ignoreFilesFromWatch?: RegExp
}

export function createWatcher({ignoreFilesFromWatch}: WatcherOptions): Watcher {
  let internalWatcher: FSWatcher;
  const eventEmitter: EventsBase = new EventEmitter();

  function init() {
    // we need to make sure we hang, so just watch this file
    internalWatcher = watch([], {
      ignored: ignoreFilesFromWatch,
      ignoreInitial: true,
      persistent: true,
      followSymlinks: true,
    });

    // Something to use when events are received.
    // const log = console.log.bind(console);
    // Add event listeners.
    internalWatcher
      .on('all', (event: keyof EventMap, path: string) => {
        // console.log('changed', path)
        eventEmitter.emit('all', event, path);
        eventEmitter.emit(event, path);
      })
      // .on('add', (path: string )=> {
      //   debugger
      //   log(`File ${path} has been added`)
      //   eventEmitter.emit('add', path)
      // })
    // .on('unlink', (path: string ) => log(`File ${path} has been removed`));
    // // More possible events.
    // internalWatcher
    //   .on('addDir', (path: string ) => log(`Directory ${path} has been added`))
    //   .on('unlinkDir', (path: string ) => log(`Directory ${path} has been removed`))
    //   .on('error', (error: string ) => log(`Watcher error: ${error}`))
    //   .on('ready', () => log('Initial scan complete. Ready for changes'))
    //   .on('raw', (event: string, path: string, details: unknown) => { // internal
    //     log('Raw event info:', event, path, details);
    //   });
  }

  const unwatchFiles: watchUnwatchFunction = (files) => {
    if (internalWatcher) {
      console.log("unwatching watch files",files)
      internalWatcher.unwatch(files);
    }
  };

  const watchFiles: watchUnwatchFunction = (files) => {
    if (internalWatcher) {
      console.log("adding watch files",files)
      internalWatcher.add(files);
    }
  };

  async function close(): Promise<void> {
    await internalWatcher.close();
  }

  return {
    init,
    close,
    unwatchFiles,
    watchFiles,
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.on.bind(eventEmitter),
  };
}
