export interface Icon {
  id: string;
  name: string;
  showSvg: string;
  fontClass: string;
}

export interface EventData {
  page: any;
  searchValue: any;
  active: "local" | "project" | "favorite" | "antd";
  icon: {
    id: string;
    svg: string;
    style: string;
  };
}

export interface EventMessage {
  type: string;
  data: EventData;
}
export interface ConfigType {
  projectUrl: string;
  projectName: string;
  transionMethod: string;
  transionSvgDir: string;
  transionFontClassDir: string;
  transionSymbolJsDir: string;
  symbolJsWiteTemplateDir: string;
  cookie?: string;
  active?: boolean;
}

export interface ProjectDetail {
  project: {
    id: number;
    name: string;
    description?: string;
    font_resource?: string; // fallback css url
    font_family?: string;
    css_prefix_text?: string;
    guid?: string;
    // Add other known properties if needed
  };
  font: {
    css_file: string;
    js_file: string;
    eot_file?: string;
    woff_file?: string;
    ttf_file?: string;
    svg_file?: string;
    css_prefix_text?: string;
    font_family?: string;
    [key: string]: string | undefined;
  };
  icons: {
    id: number;
    name: string;
    font_class: string;
    unicode: string;
    unicode_decimal: number;
    show_svg: string;
    path_attributes?: string;
    [key: string]: any;
  }[];
}
