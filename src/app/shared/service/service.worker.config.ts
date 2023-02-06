export let generatedServiceWorkerUrl: string;

(() => {
    const _oldWorker = Worker;
    // Override the real Worker with a stub
    // to return the filename, which will be generated/replaced by the worker-plugin.
    // @ts-ignore
    Worker = class WorkerStub {
        constructor(public stringUrl: string, public options?: WorkerOptions) {}
    };

    const worker = new Worker(new URL('./service.worker', import.meta.url)) as any;
    generatedServiceWorkerUrl = worker.stringUrl;

    Worker = _oldWorker;
})();

export const serviceWorkerConfig = {
    enabled: true,
    serviceWorkerUrl: generatedServiceWorkerUrl,
};
