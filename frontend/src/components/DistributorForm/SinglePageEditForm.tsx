import React, { useEffect, useState } from 'react'
import { Form, Input, Select, InputNumber, Button, Card, Row, Col, Space, message } from 'antd'
import { nameRule, nameUniquenessRule, phoneRule, creditLimitRule, tagsRule } from '../../utils/validators'

const { Option } = Select
const { TextArea } = Input

interface SinglePageEditFormProps {
  initialData: any
  onFinish: (values: any) => Promise<void>
  onCancel: () => void
}

const SinglePageEditForm: React.FC<SinglePageEditFormProps> = ({
  initialData,
  onFinish,
  onCancel,
}) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const region = Form.useWatch('region', form)

  useEffect(() => {
    if (initialData) {
      const tags = initialData.tags
        ? (typeof initialData.tags === 'string'
            ? initialData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
            : initialData.tags)
        : []
      form.setFieldsValue({ ...initialData, tags })
    }
  }, [initialData, form])

  const handleSubmit = async (values: any) => {
    setSubmitting(true)
    try {
      await onFinish(values)
    } catch {
      message.error('保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Card title="基础信息" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="经销商名称"
              name="name"
              rules={[
                nameRule,
                region ? nameUniquenessRule(region, initialData?.id) : { required: false },
              ]}
            >
              <Input placeholder="请输入经销商名称" maxLength={50} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="区域"
              name="region"
              rules={[{ required: true, message: '请选择区域' }]}
            >
              <Select placeholder="请选择区域" showSearch optionFilterProp="children">
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
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="合作等级"
              name="cooperationLevel"
              rules={[{ required: true, message: '请选择合作等级' }]}
            >
              <Select>
                <Option value="bronze">青铜</Option>
                <Option value="silver">白银</Option>
                <Option value="gold">黄金</Option>
                <Option value="platinum">铂金</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="标签" name="tags" rules={[tagsRule]}>
              <Select mode="tags" placeholder="选择或输入标签（最多5个）" maxCount={5}>
                <Option value="VIP">VIP</Option>
                <Option value="Strategic Partner">战略伙伴</Option>
                <Option value="Long-term">长期合作</Option>
                <Option value="High Volume">高成交量</Option>
                <Option value="New Partner">新合作伙伴</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="联系方式" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="联系人"
              name="contactPerson"
              rules={[
                { required: true, message: '请输入联系人' },
                { min: 2, max: 20, message: '联系人长度需为2-20个字符' },
              ]}
            >
              <Input placeholder="请输入联系人姓名" maxLength={20} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="联系电话" name="phone" rules={[phoneRule]}>
              <Input placeholder="请输入联系电话" maxLength={20} />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="其他信息" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="授信额度（万元）" name="creditLimit" rules={[creditLimitRule]}>
              <InputNumber
                placeholder="请输入授信额度"
                min={0}
                max={999999}
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => Number((value || '').replace(/,/g, '')) as 0 | 999999}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="历史业绩" name="historicalPerformance">
          <TextArea placeholder="请输入相关业绩说明" rows={3} maxLength={500} showCount />
        </Form.Item>
        <Form.Item label="备注" name="notes">
          <TextArea placeholder="请输入补充备注" rows={3} maxLength={500} showCount />
        </Form.Item>
      </Card>

      <Space>
        <Button onClick={onCancel} disabled={submitting}>取消</Button>
        <Button type="primary" htmlType="submit" loading={submitting}>保存</Button>
      </Space>
    </Form>
  )
}

export default SinglePageEditForm
