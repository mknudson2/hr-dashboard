"""
Pydantic v2 models for TazWorks API entities.

Convention:
- Python attributes use snake_case
- Field(alias="pascalCase") maps to TazWorks JSON field names
- model_config with populate_by_name=True allows both conventions
- Use model_dump(by_alias=True) when serializing for TazWorks API calls
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date
from enum import Enum


# --- Enums ---

class OrderStatus(str, Enum):
    APPLICANT_PENDING = "applicant-pending"
    PENDING = "pending"
    PARTIAL = "partial"
    READY = "ready"
    CANCELED = "canceled"
    ERROR = "error"


class OrderDecision(str, Enum):
    APPROVED = "Approved"
    DECLINE = "Decline"
    REVIEW = "Review"


class AddressType(str, Enum):
    DOMESTIC = "DOMESTIC"
    INTERNATIONAL = "INTERNATIONAL"


# --- Base config ---

class TazWorksModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


# --- Applicant ---

class ApplicantCreate(TazWorksModel):
    first_name: str = Field(..., alias="firstName")
    last_name: str = Field(..., alias="lastName")
    email: str = Field(..., alias="email")
    middle_name: Optional[str] = Field(None, alias="middleName")
    phone: Optional[str] = Field(None, alias="phone")


class ApplicantResponse(TazWorksModel):
    applicant_guid: str = Field(..., alias="applicantGuid")
    first_name: str = Field(..., alias="firstName")
    last_name: str = Field(..., alias="lastName")
    email: str = Field(..., alias="email")
    created_date: Optional[int] = Field(None, alias="createdDate")
    modified_date: Optional[int] = Field(None, alias="modifiedDate")
    version: Optional[int] = None


# --- Address ---

class AddressCreate(TazWorksModel):
    address_type: AddressType = Field(AddressType.DOMESTIC, alias="addressType")
    street_one: str = Field(..., alias="streetOne")
    street_two: Optional[str] = Field(None, alias="streetTwo")
    city: str = Field(...)
    state_or_province: str = Field(..., alias="stateOrProvince")
    postal_code: str = Field(..., alias="postalCode")
    country: str = Field("US")


# --- Education ---

class EducationCreate(TazWorksModel):
    institution_name: str = Field(..., alias="institutionName")
    registrar_phone: Optional[str] = Field(None, alias="registrarPhone")
    registrar_email: Optional[str] = Field(None, alias="registrarEmail")
    address_type: AddressType = Field(AddressType.DOMESTIC, alias="addressType")
    street_one: Optional[str] = Field(None, alias="streetOne")
    street_two: Optional[str] = Field(None, alias="streetTwo")
    city: Optional[str] = None
    state_or_province: Optional[str] = Field(None, alias="stateOrProvince")
    postal_code: Optional[str] = Field(None, alias="postalCode")
    country: Optional[str] = Field("US")
    start_date: Optional[date] = Field(None, alias="startDate")
    end_date: Optional[date] = Field(None, alias="endDate")
    first_name_used: Optional[str] = Field(None, alias="firstNameUsed")
    last_name_used: Optional[str] = Field(None, alias="lastNameUsed")
    degree: Optional[str] = None
    degree_date: Optional[date] = Field(None, alias="degreeDate")
    gpa: Optional[str] = None
    major: Optional[str] = None
    honors: Optional[str] = None


class EducationResponse(EducationCreate):
    education_guid: str = Field(..., alias="educationGuid")
    created_date: Optional[int] = Field(None, alias="createdDate")
    created_by: Optional[str] = Field(None, alias="createdBy")
    modified_date: Optional[int] = Field(None, alias="modifiedDate")
    modified_by: Optional[str] = Field(None, alias="modifiedBy")
    version: Optional[int] = None


# --- Employment ---

class EmploymentCreate(TazWorksModel):
    employer_name: str = Field(..., alias="employerName")
    supervisor_name: Optional[str] = Field(None, alias="supervisorName")
    supervisor_phone: Optional[str] = Field(None, alias="supervisorPhone")
    supervisor_email: Optional[str] = Field(None, alias="supervisorEmail")
    address_type: AddressType = Field(AddressType.DOMESTIC, alias="addressType")
    street_one: Optional[str] = Field(None, alias="streetOne")
    city: Optional[str] = None
    state_or_province: Optional[str] = Field(None, alias="stateOrProvince")
    postal_code: Optional[str] = Field(None, alias="postalCode")
    country: Optional[str] = Field("US")
    start_date: Optional[date] = Field(None, alias="startDate")
    end_date: Optional[date] = Field(None, alias="endDate")
    position_title: Optional[str] = Field(None, alias="positionTitle")
    salary: Optional[str] = None
    reason_for_leaving: Optional[str] = Field(None, alias="reasonForLeaving")


# --- Order ---

class OrderSubmit(TazWorksModel):
    applicant_guid: str = Field(..., alias="applicantGuid")
    client_product_guid: str = Field(..., alias="clientProductGuid")
    use_quick_app: bool = Field(True, alias="useQuickApp")


class OrderResponse(TazWorksModel):
    order_guid: str = Field(..., alias="orderGuid")
    status: Optional[str] = None
    quickapp_applicant_link: Optional[str] = Field(None, alias="quickappApplicantLink")
    file_number: Optional[int] = Field(None, alias="fileNumber")
    created_date: Optional[int] = Field(None, alias="createdDate")


class OrderStatusResponse(TazWorksModel):
    order_guid: str = Field(..., alias="orderGuid")
    status: str = Field(...)
    decision: Optional[str] = None
    report_url: Optional[str] = Field(None, alias="reportUrl")


# --- Search ---

class SearchAdd(TazWorksModel):
    type: str = Field(...)
    values: Optional[list[dict]] = None
    custom_search_guid: Optional[str] = Field(None, alias="customSearchGuid")


class SearchResponse(TazWorksModel):
    order_search_guid: str = Field(..., alias="orderSearchGuid")
    status: str = Field(...)
    type: str = Field(...)
    display_name: str = Field(..., alias="displayName")
    display_value: Optional[str] = Field(None, alias="displayValue")
    modified_date: Optional[int] = Field(None, alias="modifiedDate")


# --- Attachments ---

class AttachmentResponse(TazWorksModel):
    name: str = Field(...)
    original_file_name: str = Field(..., alias="originalFileName")
    encoded_content: str = Field(..., alias="encodedContent")
    authorization_form: bool = Field(False, alias="authorizationForm")
    cra_only: bool = Field(False, alias="craOnly")


class QuickAppAttachment(TazWorksModel):
    signed_date: int = Field(..., alias="signedDate")
    content: str = Field(...)


# --- Client / Product ---

class ClientProduct(TazWorksModel):
    client_product_guid: str = Field(..., alias="clientProductGuid")
    product_name: str = Field(..., alias="productName")
    product_guid: Optional[str] = Field(None, alias="productGuid")


# --- Error ---

class TazWorksErrorResponse(TazWorksModel):
    code: str = Field(...)
    message: Optional[str] = None
    fields: Optional[dict] = None
