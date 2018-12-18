export declare function c2js(config?: c2js.Config, onReady?: c2js.OnReady): any;
export declare function c2js(el: HTMLElement | string, config?: c2js.Config, onReady?: c2js.OnReady): any;
export declare namespace c2js {
    type Config = {
        saveWith?: 'none' | 'cookie' | 'localStorage';
        saveTime?: boolean;
        speed?: {
            min?: number;
            max?: number;
        };
        timer?: number;
        timeout?: number;
        timeFormat?: string;
    };
    type C2Event = {
        originalEvent: Event;
        root: C2Element;
        $root: c2.Query;
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
    interface C2Element extends HTMLElement {
        c2?: any;
    }
    const APP_NAME = "c2js";
    function DOMReady(fn: Function): void;
    function ready(fn: Function): void;
    function toggleVal(value: any, toggle: any[]): any;
    class Init {
        id: string;
        private status;
        private shortcuts;
        private $root;
        private root;
        private $media;
        private media;
        private config;
        private cache;
        constructor(el: any, config?: Config, onReady?: Function);
        private executeOnReadyHandlers;
        private mediaReadyState;
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
    function c2(selector: any, context?: any): c2.Query;
    namespace c2 {
        class Query {
            [key: string]: any;
            private list;
            constructor(selector: any, context: DOC | C2Element);
            each(handler: (i: number, el: C2Element) => void): this;
            on(events: any, fn: any, capture?: any): this;
            off(events: any, fn: any, capture?: any): this;
            one(events: any, fn: any, capture?: any): this;
            private eventListener;
            trigger(type: any): this;
            empty(): boolean;
            toggleClass(className: string): Query;
            addClass(className: string): Query;
            removeClass(className: string): Query;
            requestClassList(fnName: string, className: string): Query;
            attr(name: string, value?: any): any;
            attrIfNotExists(attr: string, value: any): Query;
            prop(prop: string, value?: any): any;
            val(value?: any): any;
            text(text?: any): any;
            css(styleName: any, value?: any): any;
            find(selector: string): Query;
            findOne(selector: string): Query;
            filter(filter: (i: number, el: C2Element) => boolean): Query;
            first(): Query;
            get(index: number): C2Element;
            control(type: any): any;
            custom(id: any): any;
            config(config: any): any;
        }
        function each(arrLike: ArrayLikeObject, iterator: any): any;
        function storage(key: string, value?: any): any;
        function cookie(key: string, value?: any): any;
        const fn: Query;
    }
}
