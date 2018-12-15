export declare function c2js(el: any, config?: c2js.Config, onReady?: c2js.OnReady): void;
export declare namespace c2js {
    type Config = {
        saveWith?: 'none' | 'cookie' | 'localStorage';
        saveTime?: boolean;
        speed?: {
            min?: number;
            max?: number;
        };
    };
    type C2Event = {
        originalEvent: Event;
        c2js: HTMLElement;
        $c2js: c2.Query;
        media: HTMLMediaElement;
        $media: c2.Query;
        $all: c2.Query;
        context: c2js.Init;
        [key: string]: any;
    };
    type OnReady = (c2js: c2js.Init) => void;
    type ArrayLikeObject = {
        [key: string]: any;
        length?: number;
    };
    interface DOC extends Document {
        [key: string]: any;
    }
    interface WIN extends Window {
        [key: string]: any;
    }
    const APP_NAME = "c2js";
    function ready(fn: Function): void;
    function startAll(config?: c2js.Config, onReady?: c2js.OnReady): void;
    function toggleVal(value: any, toggle: any[]): any;
    class Init {
        private status;
        private shortcuts;
        private $c2js;
        private c2js;
        private $media;
        private media;
        private config;
        private cache;
        constructor(el: any, config?: Config, onReady?: Function);
        private readyStateAtLeast;
        private searchCtrl;
        private createHandler;
        private getAll;
        private setStatus;
        private addStatus;
        private rmStatus;
        private hasStatus;
        private initControls;
        private propertyController;
        private bindEvents;
        private bindMedia;
        private bindReady;
        private addShortcuts;
        private bindShortcuts;
        private redirectControlFocus;
        private ctrls;
        private loadSavedInfo;
        private bindSaveEvents;
    }
    function c2(selector: string | HTMLElement | ArrayLike<HTMLElement> | DOC, context?: any): c2.Query;
    namespace c2 {
        class Query {
            [key: string]: any;
            private list;
            constructor(selector: any, context: DOC | HTMLElement);
            each(handler: (i: number, el: HTMLElement) => void): this;
            on(events: any, fn: any, capture?: any): this;
            off(events: any, fn: any, capture?: any): this;
            one(events: any, fn: any, capture?: any): this;
            private eventListener;
            trigger(type: any): this;
            empty(): boolean;
            attr(name: string, value?: any): any;
            attrIfNotExists(attr: string, value: any): Query;
            val(value?: any): any;
            text(text?: any): any;
            css(styleName: any, value?: any): any;
            find(selector: string): Query;
            findOne(selector: string): Query;
            filter(filter: (i: number, el: HTMLElement) => boolean): Query;
            first(): HTMLElement | DOC | WIN;
        }
        function each(arrLike: ArrayLikeObject, iterator: any): any;
        function storage(key: string, value?: any): any;
        function cookie(key: string, value?: any): any;
        const fn: Query;
    }
}
