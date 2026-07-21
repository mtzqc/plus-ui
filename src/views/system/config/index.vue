<template>
  <div class="p-2 app-container system-config-page">
    <div class="search-wrap">
      <el-card shadow="hover" class="search-panel" :class="{ 'is-collapsed': !showSearch }">
        <template #header>
          <div class="panel-heading search-panel-toggle" @click.stop="showSearch = !showSearch">
            <div>
              <span class="panel-kicker">Search Filters</span>
              <h3>筛选条件</h3>
            </div>
          </div>
        </template>
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" class="query-form">
          <el-form-item label="参数名称" prop="configName">
            <el-input
              v-model="queryParams.configName"
              placeholder="请输入参数名称"
              clearable
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="参数键名" prop="configKey">
            <el-input
              v-model="queryParams.configKey"
              placeholder="请输入参数键名"
              clearable
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <el-card v-loading="loading" shadow="hover" class="table-panel config-panel">
      <template #header>
        <div class="toolbar-shell">
          <div class="table-heading">
            <span class="panel-kicker">Config Dataset</span>
            <h3>参数列表</h3>
            <p>共 {{ total }} 条记录，支持键值维护、导出和缓存刷新。</p>
          </div>
          <div class="toolbar-actions">
            <el-button v-hasPermi="['system:config:add']" type="primary" plain icon="Plus" @click="handleAdd">
              新增
            </el-button>
            <el-button v-hasPermi="['system:config:export']" type="warning" plain icon="Download" @click="handleExport">
              导出
            </el-button>
            <el-button
              v-hasPermi="['system:config:remove']"
              type="danger"
              plain
              icon="Refresh"
              @click="handleRefreshCache"
            >
              刷新缓存
            </el-button>
            <right-toolbar v-model:show-search="showSearch" :search="false" @query-table="getList"></right-toolbar>
          </div>
        </div>
      </template>

      <div class="config-body">
        <el-tabs v-model="activeTab" tab-position="left" class="config-tabs" @tab-change="handleTabChange">
          <el-tab-pane label="全部" name="" />
          <el-tab-pane label="系统内置" name="Y" />
          <el-tab-pane label="自定义配置" name="N" />
        </el-tabs>

        <div class="config-content">
          <el-table :data="configList" :border="false">
            <el-table-column label="参数名称" prop="configName" min-width="160" />
            <el-table-column label="参数键名" prop="configKey" min-width="160" />
            <el-table-column label="参数键值" prop="configValue" min-width="160" show-overflow-tooltip />
            <el-table-column label="字段类型" prop="configField" min-width="100">
              <template #default="{ row }">
                {{ CONFIG_FIELD_TYPES[row.configField] || row.configField || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="备注" prop="remark" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.remark || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ row }">
                <el-tooltip content="修改" placement="top">
                  <el-button
                    v-hasPermi="['system:config:edit']"
                    link
                    type="primary"
                    icon="Edit"
                    @click="handleUpdate(row)"
                  ></el-button>
                </el-tooltip>
                <el-tooltip content="删除" placement="top">
                  <el-button
                    v-hasPermi="['system:config:remove']"
                    link
                    type="danger"
                    icon="Delete"
                    @click="handleDelete(row)"
                  ></el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </el-table>
          <pagination
            v-show="total > 0"
            v-model:page="queryParams.pageNum"
            v-model:limit="queryParams.pageSize"
            :total="total"
            @pagination="getList"
          />
        </div>
      </div>
    </el-card>

    <!-- 添加或修改参数配置对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" append-to-body>
      <el-form ref="configFormRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="参数名称" prop="configName">
          <el-input v-model="form.configName" placeholder="请输入参数名称" />
        </el-form-item>
        <el-form-item label="参数键名" prop="configKey">
          <el-input v-model="form.configKey" placeholder="请输入参数键名" />
        </el-form-item>
        <el-form-item label="字段类型" prop="configField">
          <el-select v-model="form.configField" placeholder="请选择字段类型" @change="handleFieldTypeChange">
            <el-option
              v-for="(label, value) in CONFIG_FIELD_TYPES"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="参数键值" prop="configValue">
          <!-- string -->
          <el-input
            v-if="form.configField === 'string'"
            v-model="form.configValue"
            placeholder="请输入参数键值"
          />
          <!-- int / long -->
          <el-input
            v-else-if="form.configField === 'int' || form.configField === 'long'"
            v-model="form.configValue"
            placeholder="请输入整数"
            @input="onIntegerInput"
          />
          <!-- float / double -->
          <el-input
            v-else-if="form.configField === 'float' || form.configField === 'double'"
            v-model="form.configValue"
            placeholder="请输入数字"
            @input="onDecimalInput"
          />
          <!-- boolean -->
          <el-radio-group v-else-if="form.configField === 'boolean'" v-model="form.configValue">
            <el-radio value="true">true</el-radio>
            <el-radio value="false">false</el-radio>
          </el-radio-group>
          <!-- jsonObject / jsonList -->
          <el-input
            v-else
            v-model="form.configValue"
            type="textarea"
            :placeholder="form.configField === 'jsonObject' ? '请输入 JSON 对象' : '请输入 JSON 数组'"
          />
        </el-form-item>
        <el-form-item label="系统内置" prop="configType">
          <el-radio-group v-model="form.configType">
            <el-radio v-for="dict in sys_yes_no" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" placeholder="请输入内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Config" lang="ts">
import { listConfig, getConfig, delConfig, addConfig, updateConfig, refreshCache } from '@/api/system/config';
import { ConfigForm, ConfigQuery, ConfigVO, CONFIG_FIELD_TYPES } from '@/api/system/config/types';
import { useLoading } from '@/hooks/async/useLoading';
import { useFormDialog } from '@/hooks/dialog/useFormDialog';
import { useSearchReset } from '@/hooks/form/useSearchReset';
import { useSearchToggle } from '@/hooks/form/useSearchToggle';
import modal from '@/plugins/modal';
import { useDict } from '@/utils/dict';
import { download as requestDownload } from '@/utils/request';

const { sys_yes_no } = toRefs<any>(useDict('sys_yes_no'));

const configList = ref<ConfigVO[]>([]);
const { loading, withLoading } = useLoading(true);
const { showSearch } = useSearchToggle();
const total = ref(0);
const activeTab = ref('');

const queryFormRef = ref<ElFormInstance>();
const configFormRef = ref<ElFormInstance>();
const initFormData: ConfigForm = {
  configId: undefined,
  configName: '',
  configKey: '',
  configValue: '',
  configField: 'string',
  configType: 'Y',
  remark: ''
};
/** 根据 configField 类型验证 configValue（表单校验器） */
function validateConfigValue(_rule: any, value: string, callback: any) {
  if (!value) {
    return callback(new Error('参数键值不能为空'));
  }
  const fieldType = form.value.configField;
  if (!fieldType || fieldType === 'string') return callback();

  switch (fieldType) {
    case 'int':
    case 'long':
      if (!/^-?\d+$/.test(value)) return callback(new Error('请输入有效的整数'));
      break;
    case 'float':
    case 'double':
      if (!/^-?\d+(\.\d+)?$/.test(value)) return callback(new Error('请输入有效的数字'));
      break;
    case 'boolean':
      if (!['true', 'false'].includes(value.toLowerCase())) return callback(new Error('请输入 true 或 false'));
      break;
    case 'jsonObject':
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return callback(new Error('请输入有效的 JSON 对象'));
      } catch {
        return callback(new Error('请输入有效的 JSON 对象格式'));
      }
      break;
    case 'jsonList':
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return callback(new Error('请输入有效的 JSON 数组'));
      } catch {
        return callback(new Error('请输入有效的 JSON 数组格式'));
      }
      break;
  }
  callback();
}

const data = reactive<PageData<ConfigForm, ConfigQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    configName: '',
    configKey: '',
    configType: ''
  },
  rules: {
    configName: [{ required: true, message: '参数名称不能为空', trigger: 'blur' }],
    configKey: [{ required: true, message: '参数键名不能为空', trigger: 'blur' }],
    configValue: [{ required: true, validator: validateConfigValue, trigger: 'blur' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

const { dialog, resetForm, openDialog, showDialog, closeDialog } = useFormDialog({
  form,
  formRef: configFormRef,
  initialFormData: initFormData
});
const { resetQuery } = useSearchReset({
  queryFormRef,
  queryParams,
  pageNumKey: 'pageNum',
  afterReset: () => {
    handleQuery();
  }
});

/** 查询参数列表 */
const getList = async () => {
  await withLoading(async () => {
    const res = await listConfig({ ...queryParams.value });
    configList.value = res.data?.rows;
    total.value = res.data?.total;
  });
};
/** 取消按钮 */
const cancel = () => {
  closeDialog();
  resetForm();
};
/** 字段类型变更时清空键值 */
const handleFieldTypeChange = () => {
  form.value.configValue = '';
};
/** 限制只能输入整数 */
const onIntegerInput = (val: string | number) => {
  let s = String(val);
  // 只保留数字和负号
  s = s.replace(/[^\d-]/g, '');
  // 负号仅允许出现在开头
  const firstMinus = s.indexOf('-');
  if (firstMinus > 0) s = s.replace(/-/g, '');
  // 只保留一个开头的负号
  if (s.startsWith('-')) s = '-' + s.slice(1).replace(/-/g, '');
  form.value.configValue = s;
};
/** 限制只能输入数字（含小数） */
const onDecimalInput = (val: string | number) => {
  let s = String(val);
  // 只保留数字、负号和小数点
  s = s.replace(/[^\d.-]/g, '');
  // 只保留第一个负号（且在开头）
  const firstMinus = s.indexOf('-');
  if (firstMinus > 0) s = s.replace(/-/g, '');
  // 只保留第一个小数点
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }
  form.value.configValue = s;
};
/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};
/** tab 切换 */
const handleTabChange = (tab: string | number) => {
  queryParams.value.configType = tab as string;
  queryParams.value.pageNum = 1;
  getList();
};
/** 新增按钮操作 */
const handleAdd = () => {
  openDialog('添加参数');
};
/** 修改按钮操作 */
const handleUpdate = async (row?: Partial<ConfigVO>) => {
  resetForm();
  const configId = row?.configId;
  const res = await getConfig(configId!);
  Object.assign(form.value, res.data);
  showDialog('修改参数');
};
/** 提交按钮 */
const submitForm = () => {
  configFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      form.value.configId ? await updateConfig(form.value) : await addConfig(form.value);
      modal.msgSuccess('操作成功');
      closeDialog();
      await getList();
    }
  });
};
/** 删除按钮操作 */
const handleDelete = async (row?: Partial<ConfigVO>) => {
  const configIds = row?.configId;
  await modal.confirm('是否确认删除参数编号为"' + configIds + '"的数据项？');
  await delConfig(configIds!);
  await getList();
  modal.msgSuccess('删除成功');
};
/** 导出按钮操作 */
const handleExport = () => {
  requestDownload(
    'system/config/export',
    {
      ...queryParams.value
    },
    `config_${new Date().getTime()}.xlsx`
  );
};
/** 刷新缓存按钮操作 */
const handleRefreshCache = async () => {
  await refreshCache();
  modal.msgSuccess('刷新缓存成功');
};

onMounted(() => {
  getList();
});
</script>

<style lang="scss" scoped>
@use '@/assets/styles/components/page-shell' as pageShell;

@include pageShell.toolbar-responsive;

.config-body {
  display: flex;
}

.config-tabs {
  flex-shrink: 0;
}

.config-tabs :deep(.el-tabs__header.is-left) {
  margin-right: 0;
}

.config-tabs :deep(.el-tabs__nav-wrap.is-left::after) {
  width: 1px;
  background: var(--el-border-color-lighter);
}

.config-tabs :deep(.el-tabs__content) {
  display: none;
}

.config-tabs :deep(.el-tabs__item) {
  height: 36px;
  padding: 0 16px;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.config-tabs :deep(.el-tabs__item.is-active) {
  color: var(--el-color-primary);
  font-weight: 500;
}

.config-content {
  flex: 1;
  min-width: 0;
  padding-left: 16px;
}
</style>
