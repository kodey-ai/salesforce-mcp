# Updated insert_record Tool Usage Examples

The `insert_record` tool has been updated to accept field values directly as parameters instead of wrapping them in a `recordData` object.

## New Format

### Example 1: Creating a Quotation Record
```json
{
  "tool": "insert_record",
  "parameters": {
    "sobjectType": "quotation__c",
    "root__c": "a0jUj000005Q8jpIAC",
    "member__c": "001Uj00000NWZTdIAP",
    "RecordTypeId": "012Uj000002tEqnIAE",
    "status__c": "draft",
    "type__c": "upgrade"
  }
}
```

### Example 2: Creating a Quotation Inventory Record (Sell)
```json
{
  "tool": "insert_record",
  "parameters": {
    "sobjectType": "quotation_inventory__c",
    "quotation__c": "a0jUj000005Q8jpIAC",
    "RecordTypeId": "012Uj0000036PoPIAU",
    "supravariant_id__c": "a1EUj000002KRbMMAW",
    "product_name__c": "Apple Inc. iPhone 13 mini: 128 GB , Unlocked",
    "condition__c": "Pristine",
    "quantity_quoted__c": 1,
    "CurrencyIsoCode": "USD"
  }
}
```

### Example 3: Creating a Quotation Inventory Record (Buy)
```json
{
  "tool": "insert_record",
  "parameters": {
    "sobjectType": "quotation_inventory__c",
    "quotation__c": "a0jUj000005Q8jpIAC",
    "RecordTypeId": "012Uj0000036PmnIAE",
    "supravariant_id__c": "a1EUj000002KRbNMAW",
    "product_name__c": "Apple Inc. iPhone 13 mini: 256 GB, Unlocked",
    "quantity_quoted__c": 1,
    "CurrencyIsoCode": "USD"
  }
}
```

### Example 4: Creating a Commission Record
```json
{
  "tool": "insert_record",
  "parameters": {
    "sobjectType": "quotation_inventory__c",
    "quotation__c": "a0jUj000005Q8jpIAC",
    "product_name__c": "Service Platform Fee",
    "quantity_quoted__c": 1,
    "CurrencyIsoCode": "USD"
  }
}
```

## Key Changes
- **No `recordData` wrapper**: Field values are now passed directly as parameters
- **Simpler structure**: All fields are at the same level as `sobjectType`
- **More intuitive**: The tool now accepts fields exactly as shown in your request examples
- **Flexible**: Can accept any field names dynamically using Zod's `.passthrough()` schema

## Technical Implementation
The tool uses Zod's `.passthrough()` method to accept any additional fields beyond the required `sobjectType`. During execution, it extracts the `sobjectType` and uses all other parameters as the record data to insert.