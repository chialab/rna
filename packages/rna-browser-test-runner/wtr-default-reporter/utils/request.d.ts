/// <reference types="node" />
import { RequestOptions, IncomingMessage } from 'http';
export interface Response {
    response: IncomingMessage;
    body?: string;
}
export declare function request(options: RequestOptions): Promise<Response>;
//# sourceMappingURL=request.d.ts.map