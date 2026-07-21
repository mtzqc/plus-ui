/** 字段类型映射 */
export const CONFIG_FIELD_TYPES: Record<string, string> = {
  string: '字符串',
  int: '整数',
  long: '长整数',
  float: '浮点数',
  double: '双精度浮点数',
  boolean: '布尔值',
  jsonObject: 'JSON 对象',
  jsonList: 'JSON 数组'
};

export interface ConfigVO extends BaseEntity {
  configId: number | string;
  configName: string;
  configKey: string;
  configValue: string;
  configField: string;
  configType: string;
  remark: string;
}

export interface ConfigForm {
  configId: number | string | undefined;
  configName: string;
  configKey: string;
  configValue: string;
  configField: string;
  configType: string;
  remark: string;
}

export interface ConfigQuery extends PageQuery {
  configName: string;
  configKey: string;
  configType: string;
}
