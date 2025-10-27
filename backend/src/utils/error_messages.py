"""
中文友好错误消息处理
提供用户友好的中文错误提示，包含具体问题说明和操作指导
"""

import re
from typing import Dict, Any, List


class ErrorMessage:
    """错误消息类，包含用户友好的中文提示"""

    def __init__(self, message: str, suggestion: str = None):
        self.message = message
        self.suggestion = suggestion or ""

    def to_dict(self) -> Dict[str, str]:
        return {
            "message": self.message,
            "suggestion": self.suggestion
        }


# 常见验证错误的中文映射
VALIDATION_ERROR_MESSAGES = {
    # 邮箱相关错误
    "email_empty": ErrorMessage(
        "邮箱地址不能为空",
        "请输入有效的邮箱地址，例如：user@example.com"
    ),
    "email_invalid_format": ErrorMessage(
        "邮箱格式不正确",
        "请输入正确的邮箱格式，例如：user@example.com（必须包含@符号和域名）"
    ),
    "email_missing_domain": ErrorMessage(
        "邮箱域名不完整",
        "请输入完整的邮箱地址，域名部分需要包含点号，例如：user@example.com"
    ),

    # 手机号相关错误
    "phone_empty": ErrorMessage(
        "手机号码不能为空",
        "请输入有效的手机号码，例如：+8613800138000"
    ),
    "phone_invalid_format": ErrorMessage(
        "手机号码格式不正确",
        "请输入正确的手机号码格式，必须以+开头并包含国家代码，例如：+8613800138000"
    ),

    # 用户名相关错误
    "username_empty": ErrorMessage(
        "用户名不能为空",
        "请输入用户名，长度为3-50个字符，可包含字母、数字和下划线"
    ),
    "username_too_short": ErrorMessage(
        "用户名太短",
        "用户名至少需要3个字符，请重新输入"
    ),
    "username_too_long": ErrorMessage(
        "用户名太长",
        "用户名最多50个字符，请缩短用户名"
    ),

    # 密码相关错误
    "password_empty": ErrorMessage(
        "密码不能为空",
        "请输入密码，密码长度至少8个字符，建议包含大小写字母、数字和特殊字符"
    ),
    "password_too_weak": ErrorMessage(
        "密码强度不够",
        "密码必须至少8个字符，建议包含大小写字母、数字和特殊字符以提高安全性"
    ),

    # 渠道相关错误
    "channel_name_empty": ErrorMessage(
        "渠道名称不能为空",
        "请输入渠道名称，长度为2-100个字符"
    ),
    "channel_name_duplicate": ErrorMessage(
        "渠道名称已存在",
        "该渠道名称已被使用，请选择其他名称"
    ),
    "channel_contact_person_empty": ErrorMessage(
        "联系人姓名不能为空",
        "请输入联系人姓名"
    ),

    # 数字验证错误
    "quarter_invalid": ErrorMessage(
        "季度值无效",
        "季度必须是1-4之间的数字（1=第一季度，2=第二季度，3=第三季度，4=第四季度）"
    ),
    "month_invalid": ErrorMessage(
        "月份值无效",
        "月份必须是1-12之间的数字（1=1月，2=2月，...，12=12月）"
    ),
    "year_invalid": ErrorMessage(
        "年份值无效",
        "年份必须在1900-2100之间"
    ),

    # UUID相关错误
    "uuid_empty": ErrorMessage(
        "ID不能为空",
        "请提供有效的ID值"
    ),
    "uuid_invalid": ErrorMessage(
        "ID格式无效",
        "提供的ID格式不正确，请检查后重试"
    ),

    # 通用错误
    "field_required": ErrorMessage(
        "必填字段缺失",
        "请填写所有必填字段后重试"
    ),
    "field_too_long": ErrorMessage(
        "输入内容过长",
        "请缩短输入内容长度"
    ),
    "field_too_short": ErrorMessage(
        "输入内容过短",
        "请输入更多内容"
    ),
}


def get_friendly_error_message(error_type: str, field_name: str = "",
                              original_message: str = "") -> Dict[str, str]:
    """
    根据错误类型获取用户友好的中文错误消息

    Args:
        error_type: 错误类型
        field_name: 字段名称
        original_message: 原始错误消息

    Returns:
        包含友好错误消息的字典
    """
    # 尝试匹配预定义的错误类型
    if error_type in VALIDATION_ERROR_MESSAGES:
        return VALIDATION_ERROR_MESSAGES[error_type].to_dict()

    # 根据原始消息推断错误类型
    error_msg = original_message.lower()

    # 邮箱相关错误
    if "email" in field_name.lower() or "邮箱" in field_name:
        if "empty" in error_msg or "不能为空" in error_msg:
            return VALIDATION_ERROR_MESSAGES["email_empty"].to_dict()
        elif "invalid" in error_msg or "format" in error_msg or "period" in error_msg:
            if "period" in error_msg:
                return VALIDATION_ERROR_MESSAGES["email_missing_domain"].to_dict()
            return VALIDATION_ERROR_MESSAGES["email_invalid_format"].to_dict()

    # 手机号相关错误
    if "phone" in field_name.lower() or "手机" in field_name:
        if "empty" in error_msg:
            return VALIDATION_ERROR_MESSAGES["phone_empty"].to_dict()
        return VALIDATION_ERROR_MESSAGES["phone_invalid_format"].to_dict()

    # 密码相关错误
    if "password" in field_name.lower() or "密码" in field_name:
        if "empty" in error_msg:
            return VALIDATION_ERROR_MESSAGES["password_empty"].to_dict()
        return VALIDATION_ERROR_MESSAGES["password_too_weak"].to_dict()

    # 用户名相关错误
    if "username" in field_name.lower() or "用户名" in field_name:
        if "empty" in error_msg:
            return VALIDATION_ERROR_MESSAGES["username_empty"].to_dict()
        elif "too short" in error_msg or "至少" in error_msg:
            return VALIDATION_ERROR_MESSAGES["username_too_short"].to_dict()
        elif "too long" in error_msg or "最多" in error_msg:
            return VALIDATION_ERROR_MESSAGES["username_too_long"].to_dict()

    # 通用字段错误
    if "required" in error_msg or "必填" in error_msg:
        return VALIDATION_ERROR_MESSAGES["field_required"].to_dict()

    # 默认返回清理后的消息
    return {
        "message": f"输入验证失败：{field_name}",
        "suggestion": "请检查输入内容的格式是否正确，如需帮助请联系系统管理员"
    }


def process_pydantic_error(error: Dict[str, Any]) -> Dict[str, str]:
    """
    处理Pydantic验证错误，转换为用户友好的中文消息

    Args:
        error: Pydantic错误对象

    Returns:
        用户友好的错误消息字典
    """
    error_type = error.get("type", "")
    field_name = error.get("loc", [])[-1] if error.get("loc") else ""
    original_msg = error.get("msg", "")

    # 字段名中文映射
    field_name_map = {
        "username": "用户名",
        "email": "邮箱地址",
        "password": "密码",
        "phone": "手机号码",
        "contact_email": "联系邮箱",
        "contact_phone": "联系电话",
        "contact_person": "联系人",
        "name": "名称",
        "description": "描述",
        "quarter": "季度",
        "month": "月份",
        "year": "年份",
    }

    chinese_field_name = field_name_map.get(field_name, field_name)

    # 处理常见的Pydantic错误类型
    if error_type == "value_error.email":
        if "period" in original_msg:
            return VALIDATION_ERROR_MESSAGES["email_missing_domain"].to_dict()
        return VALIDATION_ERROR_MESSAGES["email_invalid_format"].to_dict()

    elif error_type == "value_error.missing":
        return {
            "message": f"{chinese_field_name}不能为空",
            "suggestion": f"请填写{chinese_field_name}字段"
        }

    elif error_type == "value_error.any_str.min_length":
        min_length = re.search(r'at least (\d+)', original_msg)
        min_len = min_length.group(1) if min_length else "指定"
        return {
            "message": f"{chinese_field_name}长度不足",
            "suggestion": f"{chinese_field_name}至少需要{min_len}个字符"
        }

    elif error_type == "value_error.any_str.max_length":
        max_length = re.search(r'at most (\d+)', original_msg)
        max_len = max_length.group(1) if max_length else "指定"
        return {
            "message": f"{chinese_field_name}长度超限",
            "suggestion": f"{chinese_field_name}最多{max_len}个字符"
        }

    elif "enum" in error_type:
        return {
            "message": f"{chinese_field_name}的值不在允许范围内",
            "suggestion": "请选择有效的选项值"
        }

    # 其他错误类型的通用处理
    return get_friendly_error_message(error_type, chinese_field_name, original_msg)


def format_validation_errors(errors: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    格式化验证错误列表为用户友好的响应

    Args:
        errors: 验证错误列表

    Returns:
        格式化后的错误响应
    """
    if not errors:
        return {
            "message": "数据验证失败",
            "suggestion": "请检查输入数据的格式"
        }

    # 如果只有一个错误，直接返回处理后的消息
    if len(errors) == 1:
        return process_pydantic_error(errors[0])

    # 多个错误时，返回第一个主要错误和总体提示
    primary_error = process_pydantic_error(errors[0])

    return {
        "message": primary_error["message"],
        "suggestion": f"{primary_error['suggestion']} 另外还有{len(errors)-1}个字段需要修正。",
        "details": [process_pydantic_error(error) for error in errors]
    }