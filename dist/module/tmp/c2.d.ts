declare function c2js(config?: c2js.Config): void;
declare namespace c2js {
    type Config = {
        saveWith?: 'none' | 'cookie' | 'localStorage';
        saveConfig?: boolean;
        saveCurrentTime?: boolean;
        speed?: {
            min?: number;
            max?: number;
        };
        debug?: boolean;
    };
    type ArrayLikeObject = {
        [key: string]: any;
        length?: number;
    };
    interface Doc extends Document {
        [key: string]: any;
    }
    interface Win extends Window {
        [key: string]: any;
    }
    const APP_NAME = "c2js";
    const DOC: Doc;
    const WIN: Win;
    function toggleVal(value: any, toggle: any[]): any;
    class init {
        private status;
        private shortcuts;
        private $c2js;
        private c2js;
        private $media;
        private media;
        private config;
        constructor(el: any, config?: Config);
        private searchCtrl;
        private createHandler;
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
    }
    function c2(selector: string | HTMLElement | ArrayLike<HTMLElement> | Doc, context?: any): c2.Query;
    namespace c2 {
        class Query {
            [key: string]: any;
            private list;
            constructor(selector: any, context: Doc | HTMLElement);
            each(handler: (i: number, el: HTMLElement) => void): this;
            on(events: any, fn: any): this;
            trigger(type: any): this;
            empty(): boolean;
            attr(name: string, value?: any): any;
            prop(name: string, value?: any): any;
            val(value?: any): any;
            text(text?: any): any;
            css(styleName: any, value?: any): any;
            find(selector: string): Query;
            filter(filter: (i: number, el: HTMLElement) => boolean): Query;
            get(index: number): HTMLElement | Doc | Win;
        }
        function each(arrLike: ArrayLikeObject, iterator: any): any;
        const fn: Query;
    }
}
