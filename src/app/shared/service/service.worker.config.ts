import { environment } from "src/environments/environment";

const _oldWorker = Worker;
// Override the real Worker with a stub
// to return the filename, which will be generated/replaced by the worker-plugin.
// @ts-ignore
Worker = class WorkerStub {
    constructor(public stringUrl: string, public options?: WorkerOptions) {}
};

const worker = new Worker(new URL('./service.worker', import.meta.url)) as any;
export const generatedServiceWorkerUrl = worker.stringUrl;
Worker = _oldWorker;

export const serviceWorkerConfig = {
  enabled: environment.enableService,
  serviceWorkerUrl: generatedServiceWorkerUrl,
};
