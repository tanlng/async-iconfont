export interface Icon {
  id: string;
  name: string;
  showSvg: string;
  fontClass: string;
}

export interface EventData {
  page: any;
  searchValue: any;
  active: 'local' | 'project' | 'favorite' | 'antd',
  icon: {
    id: string;
    svg: string;
    style: string;
  }
}

export interface EventMessage {
  type: string;
  data: EventData;
}
export interface ConfigType{
  projectUrl:string;
  projectName: string;
  transionMethod: string;
  transionSvgDir: string;
  transionFontClassDir: string;
  transionSymbolJsDir: string;
  symbolJsWiteTemplateDir: string;
  active?:boolean
}