/**
 * 支出記録アプリ - Google Apps Script
 * スプレッドシート連携用のAPIエンドポイント
 */

/**
 * スプレッドシートを取得（存在しない場合は作成）
 * @returns {Spreadsheet} スプレッドシートオブジェクト
 */
function getSpreadsheet() {
  // ScriptPropertiesからスプレッドシートIDを取得
  let spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  
  if (spreadsheetId) {
    try {
      const ss = SpreadsheetApp.openById(spreadsheetId);
      return ss;
    } catch (error) {
      // スプレッドシートが見つからない場合は新規作成
      console.log('スプレッドシートが見つかりません。新規作成します。');
    }
  }
  
  // 新規スプレッドシートを作成
  const ss = SpreadsheetApp.create('支出記録データ');
  const sheet = ss.getActiveSheet();
  setupSheet(sheet);
  
  // ScriptPropertiesに保存
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  
  return ss;
}

/**
 * シートの初期設定（ヘッダー行の設定）
 * @param {Sheet} sheet - シートオブジェクト
 */
function setupSheet(sheet) {
  // ヘッダー行を設定
  sheet.getRange(1, 1, 1, 6).setValues([['id', 'date', 'category', 'paymentMethod', 'amount', 'memo']]);
  sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  sheet.getRange(1, 1, 1, 6).setBackground('#4285f4');
  sheet.getRange(1, 1, 1, 6).setFontColor('#ffffff');
}

/**
 * 支出レコードを取得
 * GET リクエストで全レコードを取得
 * @returns {Object} レスポンスオブジェクト
 */
function doGet() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getActiveSheet();
    
    // データを取得（ヘッダー行を除く）
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const records = [];
    
    // 2行目以降をレコードとして変換
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // idが存在する場合のみ
        records.push({
          id: data[i][0],
          date: data[i][1],
          category: data[i][2],
          paymentMethod: data[i][3],
          amount: data[i][4],
          memo: data[i][5] || ''
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      records: records
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 支出レコードを保存・更新・削除
 * POST リクエストでレコードを操作
 * @param {Object} e - リクエストオブジェクト
 * @returns {Object} レスポンスオブジェクト
 */
function doPost(e) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getActiveSheet();
    
    // リクエストボディをパース
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action; // 'add', 'update', 'delete', 'sync'
    
    let result;
    
    switch (action) {
      case 'add':
        result = addRecord(sheet, requestData.record);
        break;
      case 'update':
        result = updateRecord(sheet, requestData.record);
        break;
      case 'delete':
        result = deleteRecord(sheet, requestData.id);
        break;
      case 'sync':
        result = syncRecords(sheet, requestData.records);
        break;
      default:
        throw new Error('Invalid action: ' + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      result: result
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * レコードを追加
 * @param {Sheet} sheet - シートオブジェクト
 * @param {Object} record - レコードオブジェクト
 * @returns {Object} 追加されたレコード
 */
function addRecord(sheet, record) {
  const lastRow = sheet.getLastRow();
  const newRow = lastRow + 1;
  
  sheet.getRange(newRow, 1, 1, 6).setValues([[
    record.id,
    record.date,
    record.category,
    record.paymentMethod,
    record.amount,
    record.memo || ''
  ]]);
  
  return record;
}

/**
 * レコードを更新
 * @param {Sheet} sheet - シートオブジェクト
 * @param {Object} record - 更新するレコードオブジェクト
 * @returns {Object} 更新されたレコード
 */
function updateRecord(sheet, record) {
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === record.id) {
      const row = i + 1;
      sheet.getRange(row, 1, 1, 6).setValues([[
        record.id,
        record.date,
        record.category,
        record.paymentMethod,
        record.amount,
        record.memo || ''
      ]]);
      return record;
    }
  }
  
  throw new Error('Record not found: ' + record.id);
}

/**
 * レコードを削除
 * @param {Sheet} sheet - シートオブジェクト
 * @param {string} id - レコードID
 * @returns {boolean} 削除成功フラグ
 */
function deleteRecord(sheet, id) {
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      const row = i + 1;
      sheet.deleteRow(row);
      return true;
    }
  }
  
  throw new Error('Record not found: ' + id);
}

/**
 * レコードを一括同期
 * @param {Sheet} sheet - シートオブジェクト
 * @param {Array<Object>} records - レコード配列
 * @returns {Object} 同期結果
 */
function syncRecords(sheet, records) {
  // 既存データをクリア（ヘッダー行を除く）
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  
  // シートの初期設定を確認
  if (lastRow === 0) {
    setupSheet(sheet);
  }
  
  // 新しいデータを一括書き込み
  if (records.length > 0) {
    const values = records.map(record => [
      record.id,
      record.date,
      record.category,
      record.paymentMethod,
      record.amount,
      record.memo || ''
    ]);
    
    sheet.getRange(2, 1, values.length, 6).setValues(values);
  }
  
  return {
    synced: records.length
  };
}

/**
 * カテゴリを取得
 * @returns {Object} レスポンスオブジェクト
 */
function getCategories() {
  try {
    const categories = getStorageData('expenseTracker:categories', ['食費', '交通', '光熱費', 'その他']);
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      categories: categories
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * カテゴリを保存
 * @param {Object} e - リクエストオブジェクト
 * @returns {Object} レスポンスオブジェクト
 */
function saveCategories(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const categories = requestData.categories;
    
    // ここではScriptPropertiesに保存（スプレッドシートの別シートに保存することも可能）
    PropertiesService.getScriptProperties().setProperty('categories', JSON.stringify(categories));
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      categories: categories
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ScriptPropertiesからカテゴリを取得（ヘルパー関数）
 * @param {string} key - キー
 * @param {any} defaultValue - デフォルト値
 * @returns {any} 取得したデータ
 */
function getStorageData(key, defaultValue = null) {
  try {
    const data = PropertiesService.getScriptProperties().getProperty(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

