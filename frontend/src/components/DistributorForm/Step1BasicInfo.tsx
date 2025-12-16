import React from 'react'
import { Form, Input, Select, Button, Card } from 'antd'
import { nameRule, nameUniquenessRule } from '../../utils/validators'

const { Option } = Select

interface Step1Props {
  initialValues?: any
  onSubmit: (values: any) => void
  onCancel?: () => void
}

const Step1BasicInfo: React.FC<Step1Props> = ({ initialValues, onSubmit, onCancel }) => {
  const [form] = Form.useForm()
  const region = Form.useWatch('region', form)

  const handleSubmit = (values: any) => {
    onSubmit(values)
  }

  return (
    <Card title="第1步：基础信息">
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="经销商名称"
          name="name"
          rules={[
            nameRule,
            region ? nameUniquenessRule(region, initialValues?.id) : { required: false },
          ]}
          extra={`${form.getFieldValue('name')?.length || 0}/50 字符`}
        >
          <Input
            placeholder="请输入经销商名称（2-50个字符）"
            maxLength={50}
            showCount
          />
        </Form.Item>

        <Form.Item
          label="区域"
          name="region"
          rules={[{ required: true, message: '请选择区域' }]}
        >
          <Select
            placeholder="请选择区域（省/市/区）"
            showSearch
            optionFilterProp="children"
          >
            {/* 山东省 */}
            <Option value="Shandong/Jinan/Lixia">山东/济南/历下区</Option>
            <Option value="Shandong/Jinan/Shizhong">山东/济南/市中区</Option>
            <Option value="Shandong/Jinan/Huaiyin">山东/济南/槐荫区</Option>
            <Option value="Shandong/Jinan/Tianqiao">山东/济南/天桥区</Option>
            <Option value="Shandong/Jinan/Licheng">山东/济南/历城区</Option>
            <Option value="Shandong/Jinan/Changqing">山东/济南/长清区</Option>
            <Option value="Shandong/Qingdao/Shinan">山东/青岛/市南区</Option>
            <Option value="Shandong/Qingdao/Shibei">山东/青岛/市北区</Option>
            <Option value="Shandong/Qingdao/Huangdao">山东/青岛/黄岛区</Option>
            <Option value="Shandong/Qingdao/Laoshan">山东/青岛/崂山区</Option>
            <Option value="Shandong/Qingdao/Licang">山东/青岛/李沧区</Option>
            <Option value="Shandong/Qingdao/Chengyang">山东/青岛/城阳区</Option>
            <Option value="Shandong/Qingdao/Jimo">山东/青岛/即墨区</Option>
            <Option value="Shandong/Zibo/Zhangdian">山东/淄博/张店区</Option>
            <Option value="Shandong/Zibo/Zichuan">山东/淄博/淄川区</Option>
            <Option value="Shandong/Zibo/Boshan">山东/淄博/博山区</Option>
            <Option value="Shandong/Zibo/Linzi">山东/淄博/临淄区</Option>
            <Option value="Shandong/Zibo/Zhoucun">山东/淄博/周村区</Option>
            <Option value="Shandong/Zaozhuang/Shizhong">山东/枣庄/市中区</Option>
            <Option value="Shandong/Zaozhuang/Xuecheng">山东/枣庄/薛城区</Option>
            <Option value="Shandong/Zaozhuang/Yicheng">山东/枣庄/峄城区</Option>
            <Option value="Shandong/Zaozhuang/Taierzhuang">山东/枣庄/台儿庄区</Option>
            <Option value="Shandong/Zaozhuang/Shanting">山东/枣庄/山亭区</Option>
            <Option value="Shandong/Dongying/Dongying">山东/东营/东营区</Option>
            <Option value="Shandong/Dongying/Hekou">山东/东营/河口区</Option>
            <Option value="Shandong/Dongying/Kenli">山东/东营/垦利区</Option>
            <Option value="Shandong/Yantai/Zhifu">山东/烟台/芝罘区</Option>
            <Option value="Shandong/Yantai/Fushan">山东/烟台/福山区</Option>
            <Option value="Shandong/Yantai/Muping">山东/烟台/牟平区</Option>
            <Option value="Shandong/Yantai/Laishan">山东/烟台/莱山区</Option>
            <Option value="Shandong/Yantai/Penglai">山东/烟台/蓬莱区</Option>
            <Option value="Shandong/Weifang/Kuiwen">山东/潍坊/奎文区</Option>
            <Option value="Shandong/Weifang/Weicheng">山东/潍坊/潍城区</Option>
            <Option value="Shandong/Weifang/Hanting">山东/潍坊/寒亭区</Option>
            <Option value="Shandong/Weifang/Fangzi">山东/潍坊/坊子区</Option>
            <Option value="Shandong/Jining/Rencheng">山东/济宁/任城区</Option>
            <Option value="Shandong/Jining/Yanzhou">山东/济宁/兖州区</Option>
            <Option value="Shandong/Jining/Qufu">山东/济宁/曲阜市</Option>
            <Option value="Shandong/Taian/Taishan">山东/泰安/泰山区</Option>
            <Option value="Shandong/Taian/Daiyue">山东/泰安/岱岳区</Option>
            <Option value="Shandong/Weihai/Huancui">山东/威海/环翠区</Option>
            <Option value="Shandong/Weihai/Wendeng">山东/威海/文登区</Option>
            <Option value="Shandong/Weihai/Rongcheng">山东/威海/荣成市</Option>
            <Option value="Shandong/Rizhao/Donggang">山东/日照/东港区</Option>
            <Option value="Shandong/Rizhao/Lanshan">山东/日照/岚山区</Option>
            <Option value="Shandong/Linyi/Lanshan">山东/临沂/兰山区</Option>
            <Option value="Shandong/Linyi/Luozhuang">山东/临沂/罗庄区</Option>
            <Option value="Shandong/Linyi/Hedong">山东/临沂/河东区</Option>
            <Option value="Shandong/Dezhou/Decheng">山东/德州/德城区</Option>
            <Option value="Shandong/Dezhou/Lingcheng">山东/德州/陵城区</Option>
            <Option value="Shandong/Liaocheng/Dongchangfu">山东/聊城/东昌府区</Option>
            <Option value="Shandong/Liaocheng/Chiping">山东/聊城/茌平区</Option>
            <Option value="Shandong/Binzhou/Bincheng">山东/滨州/滨城区</Option>
            <Option value="Shandong/Binzhou/Zhanhua">山东/滨州/沾化区</Option>
            <Option value="Shandong/Heze/Mudan">山东/菏泽/牡丹区</Option>
            <Option value="Shandong/Heze/Dingtao">山东/菏泽/定陶区</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="合作等级"
          name="cooperationLevel"
          rules={[{ required: true, message: '请选择合作等级' }]}
          initialValue="bronze"
        >
          <Select>
            <Option value="bronze">青铜</Option>
            <Option value="silver">白银</Option>
            <Option value="gold">黄金</Option>
            <Option value="platinum">铂金</Option>
          </Select>
        </Form.Item>

        <Form.Item style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
            下一步
          </Button>
          {onCancel && (
            <Button onClick={onCancel}>
              取消
            </Button>
          )}
        </Form.Item>
      </Form>
    </Card>
  )
}

export default Step1BasicInfo
