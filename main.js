// ============================================
// 支出記録アプリ - メインJavaScript
// ============================================

// ============================================
// データ管理: localStorage操作
// ============================================

/**
 * localStorageからデータを取得
 * @param {string} key - データのキー
 * @param {any} defaultValue - デフォルト値
 * @returns {any} 取得したデータ
 */
function getStorageData(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error(`Error getting data from localStorage (${key}):`, error);
        return defaultValue;
    }
}

/**
 * localStorageにデータを保存
 * @param {string} key - データのキー
 * @param {any} value - 保存するデータ
 */
function setStorageData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error setting data to localStorage (${key}):`, error);
        alert('データの保存に失敗しました。');
    }
}

/**
 * 初期データの設定（初回起動時のみ）
 */
function initializeData() {
    // カテゴリの初期化
    const categories = getStorageData('expenseTracker:categories', ['食費', '交通', '光熱費', 'その他']);
    setStorageData('expenseTracker:categories', categories);

    // レコードの初期化
    const records = getStorageData('expenseTracker:records', []);
    setStorageData('expenseTracker:records', records);

    // フィルタの初期化
    const filters = getStorageData('expenseTracker:filters', {
        from: '',
        to: '',
        category: 'ALL',
        paymentMethod: 'ALL'
    });
    setStorageData('expenseTracker:filters', filters);
}

// ============================================
// データ操作: CRUD機能
// ============================================

/**
 * 支出レコードを追加
 * @param {Object} expenseData - 支出データ
 */
function addExpense(expenseData) {
    const records = getStorageData('expenseTracker:records', []);
    const newExpense = {
        id: generateId(),
        date: expenseData.date,
        category: expenseData.category,
        paymentMethod: expenseData.paymentMethod,
        amount: parseInt(expenseData.amount),
        memo: expenseData.memo || ''
    };
    records.push(newExpense);
    setStorageData('expenseTracker:records', records);
    return newExpense;
}

/**
 * 支出レコードを更新
 * @param {string} id - レコードID
 * @param {Object} expenseData - 更新データ
 */
function updateExpense(id, expenseData) {
    const records = getStorageData('expenseTracker:records', []);
    const index = records.findIndex(record => record.id === id);
    if (index !== -1) {
        records[index] = {
            ...records[index],
            date: expenseData.date,
            category: expenseData.category,
            paymentMethod: expenseData.paymentMethod,
            amount: parseInt(expenseData.amount),
            memo: expenseData.memo || ''
        };
        setStorageData('expenseTracker:records', records);
        return records[index];
    }
    return null;
}

/**
 * 支出レコードを削除
 * @param {string} id - レコードID
 */
function deleteExpense(id) {
    const records = getStorageData('expenseTracker:records', []);
    const filteredRecords = records.filter(record => record.id !== id);
    setStorageData('expenseTracker:records', filteredRecords);
}

/**
 * 一意のIDを生成
 * @returns {string} UUID形式のID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============================================
// カテゴリ管理
// ============================================

/**
 * カテゴリを追加
 * @param {string} categoryName - カテゴリ名
 */
function addCategory(categoryName) {
    if (!categoryName || categoryName.trim() === '') {
        alert('カテゴリ名を入力してください。');
        return false;
    }

    const categories = getStorageData('expenseTracker:categories', []);
    const trimmedName = categoryName.trim();

    // 重複チェック
    if (categories.includes(trimmedName)) {
        alert('このカテゴリは既に存在します。');
        return false;
    }

    categories.push(trimmedName);
    setStorageData('expenseTracker:categories', categories);
    return true;
}

/**
 * カテゴリを削除
 * @param {string} categoryName - カテゴリ名
 */
function deleteCategory(categoryName) {
    const records = getStorageData('expenseTracker:records', []);
    const isUsed = records.some(record => record.category === categoryName);

    if (isUsed) {
        if (!confirm(`「${categoryName}」は使用中のため削除できません。\n使用中のレコードを削除してから再度お試しください。`)) {
            return false;
        }
    }

    const categories = getStorageData('expenseTracker:categories', []);
    const filteredCategories = categories.filter(cat => cat !== categoryName);
    setStorageData('expenseTracker:categories', filteredCategories);
    return true;
}

/**
 * カテゴリリストを取得
 * @returns {Array<string>} カテゴリの配列
 */
function getCategories() {
    return getStorageData('expenseTracker:categories', ['食費', '交通', '光熱費', 'その他']);
}

// ============================================
// フィルタリング機能
// ============================================

/**
 * フィルタを適用してレコードを取得
 * @returns {Array<Object>} フィルタ適用後のレコード配列
 */
function getFilteredRecords() {
    const records = getStorageData('expenseTracker:records', []);
    const filters = getStorageData('expenseTracker:filters', {
        from: '',
        to: '',
        category: 'ALL',
        paymentMethod: 'ALL'
    });

    let filtered = [...records];

    // 日付フィルタ
    if (filters.from) {
        filtered = filtered.filter(record => record.date >= filters.from);
    }
    if (filters.to) {
        filtered = filtered.filter(record => record.date <= filters.to);
    }

    // カテゴリフィルタ
    if (filters.category !== 'ALL') {
        filtered = filtered.filter(record => record.category === filters.category);
    }

    // 決済方法フィルタ
    if (filters.paymentMethod !== 'ALL') {
        filtered = filtered.filter(record => record.paymentMethod === filters.paymentMethod);
    }

    // 最新順にソート
    filtered.sort((a, b) => {
        if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
        }
        return b.id.localeCompare(a.id);
    });

    return filtered;
}

/**
 * フィルタを保存
 * @param {Object} filterData - フィルタデータ
 */
function saveFilters(filterData) {
    setStorageData('expenseTracker:filters', filterData);
}

// ============================================
// 集計機能
// ============================================

/**
 * 合計金額を計算
 * @param {Array<Object>} records - レコード配列
 * @returns {number} 合計金額
 */
function calculateTotal(records) {
    return records.reduce((sum, record) => sum + record.amount, 0);
}

/**
 * 月次カテゴリ別集計
 * @param {Array<Object>} records - レコード配列
 * @returns {Object} カテゴリ別の集計データ
 */
function calculateCategorySummary(records) {
    const summary = {};
    records.forEach(record => {
        if (!summary[record.category]) {
            summary[record.category] = 0;
        }
        summary[record.category] += record.amount;
    });
    return summary;
}

/**
 * 月次決済方法別集計
 * @param {Array<Object>} records - レコード配列
 * @returns {Object} 決済方法別の集計データ
 */
function calculatePaymentMethodSummary(records) {
    const summary = {};
    records.forEach(record => {
        if (!summary[record.paymentMethod]) {
            summary[record.paymentMethod] = 0;
        }
        summary[record.paymentMethod] += record.amount;
    });
    return summary;
}

// ============================================
// UI更新関数
// ============================================

/**
 * 合計金額を表示
 */
function updateTotalAmount() {
    const records = getFilteredRecords();
    const total = calculateTotal(records);
    const totalAmountElement = document.getElementById('totalAmount');
    totalAmountElement.textContent = `¥${total.toLocaleString()}`;
}

/**
 * カテゴリセレクトボックスを更新
 */
function updateCategorySelects() {
    const categories = getCategories();
    const selects = ['expenseCategory', 'filterCategory', 'editCategory'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            // 既存のオプションをクリア（"ALL"オプションは残す）
            const allOption = select.querySelector('option[value="ALL"]');
            select.innerHTML = '';
            if (allOption) {
                select.appendChild(allOption);
            }

            // カテゴリを追加
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                select.appendChild(option);
            });
        }
    });
}

/**
 * カテゴリリストを表示
 */
function renderCategoryList() {
    const categories = getCategories();
    const categoryListElement = document.getElementById('categoryList');
    categoryListElement.innerHTML = '';

    if (categories.length === 0) {
        categoryListElement.innerHTML = '<p class="empty-message">カテゴリがありません</p>';
        return;
    }

    categories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.innerHTML = `
            <span>${category}</span>
            <button type="button" class="btn-delete-category" data-category="${category}">×</button>
        `;
        categoryListElement.appendChild(categoryItem);
    });

    // 削除ボタンのイベントリスナーを追加
    document.querySelectorAll('.btn-delete-category').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-category');
            if (confirm(`「${category}」を削除しますか？`)) {
                if (deleteCategory(category)) {
                    renderCategoryList();
                    updateCategorySelects();
                    renderExpenseList();
                }
            }
        });
    });
}

/**
 * 支出リストを表示
 */
function renderExpenseList() {
    const records = getFilteredRecords();
    const expenseListElement = document.getElementById('expenseList');
    expenseListElement.innerHTML = '';

    if (records.length === 0) {
        expenseListElement.innerHTML = '<p class="empty-message">支出記録がありません</p>';
        return;
    }

    records.forEach(record => {
        const expenseItem = document.createElement('div');
        expenseItem.className = 'expense-item';
        
        // 日付をフォーマット
        const date = new Date(record.date);
        const formattedDate = date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        expenseItem.innerHTML = `
            <div class="expense-date">${formattedDate}</div>
            <div class="expense-details">
                <div class="expense-category">${record.category}</div>
                <div class="expense-payment-method">${record.paymentMethod}</div>
                ${record.memo ? `<div class="expense-memo">${record.memo}</div>` : ''}
            </div>
            <div class="expense-amount">¥${record.amount.toLocaleString()}</div>
            <div class="expense-actions">
                <button type="button" class="btn btn-secondary btn-small btn-edit" data-id="${record.id}">編集</button>
                <button type="button" class="btn btn-danger btn-small btn-delete" data-id="${record.id}">削除</button>
            </div>
        `;
        expenseListElement.appendChild(expenseItem);
    });

    // 編集・削除ボタンのイベントリスナーを追加
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            openEditModal(id);
        });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            if (confirm('この支出を削除しますか？')) {
                deleteExpense(id);
                renderExpenseList();
                updateTotalAmount();
                renderSummary();
            }
        });
    });
}

/**
 * 集計を表示
 */
function renderSummary() {
    const records = getFilteredRecords();
    
    // カテゴリ別集計
    const categorySummary = calculateCategorySummary(records);
    const categorySummaryElement = document.getElementById('monthlyCategorySummary');
    categorySummaryElement.innerHTML = '<h4>カテゴリ別</h4>';
    
    if (Object.keys(categorySummary).length === 0) {
        categorySummaryElement.innerHTML += '<p class="empty-message">データがありません</p>';
    } else {
        Object.entries(categorySummary)
            .sort((a, b) => b[1] - a[1])
            .forEach(([category, amount]) => {
                const summaryItem = document.createElement('div');
                summaryItem.className = 'summary-item';
                summaryItem.innerHTML = `
                    <span class="summary-item-label">${category}</span>
                    <span class="summary-item-amount">¥${amount.toLocaleString()}</span>
                `;
                categorySummaryElement.appendChild(summaryItem);
            });
    }

    // 決済方法別集計
    const paymentSummary = calculatePaymentMethodSummary(records);
    const paymentSummaryElement = document.getElementById('monthlyPaymentSummary');
    paymentSummaryElement.innerHTML = '<h4>決済方法別</h4>';
    
    if (Object.keys(paymentSummary).length === 0) {
        paymentSummaryElement.innerHTML += '<p class="empty-message">データがありません</p>';
    } else {
        Object.entries(paymentSummary)
            .sort((a, b) => b[1] - a[1])
            .forEach(([method, amount]) => {
                const summaryItem = document.createElement('div');
                summaryItem.className = 'summary-item';
                summaryItem.innerHTML = `
                    <span class="summary-item-label">${method}</span>
                    <span class="summary-item-amount">¥${amount.toLocaleString()}</span>
                `;
                paymentSummaryElement.appendChild(summaryItem);
            });
    }
}

// ============================================
// モーダルダイアログ
// ============================================

/**
 * 編集モーダルを開く
 * @param {string} id - レコードID
 */
function openEditModal(id) {
    const records = getStorageData('expenseTracker:records', []);
    const record = records.find(r => r.id === id);
    
    if (!record) {
        alert('レコードが見つかりません。');
        return;
    }

    document.getElementById('editId').value = record.id;
    document.getElementById('editDate').value = record.date;
    document.getElementById('editCategory').value = record.category;
    document.getElementById('editPaymentMethod').value = record.paymentMethod;
    document.getElementById('editAmount').value = record.amount;
    document.getElementById('editMemo').value = record.memo || '';

    document.getElementById('editModal').style.display = 'block';
}

/**
 * 編集モーダルを閉じる
 */
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// ============================================
// イベントリスナー設定
// ============================================

/**
 * すべてのイベントリスナーを設定
 */
function setupEventListeners() {
    // 支出追加フォーム
    const expenseForm = document.getElementById('expenseForm');
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(expenseForm);
        const expenseData = {
            date: formData.get('date'),
            category: formData.get('category'),
            paymentMethod: formData.get('paymentMethod'),
            amount: formData.get('amount'),
            memo: formData.get('memo')
        };

        // バリデーション
        if (!expenseData.date || !expenseData.category || !expenseData.paymentMethod || !expenseData.amount) {
            alert('必須項目を入力してください。');
            return;
        }

        addExpense(expenseData);
        expenseForm.reset();
        renderExpenseList();
        updateTotalAmount();
        renderSummary();
    });

    // カテゴリ追加
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    addCategoryBtn.addEventListener('click', () => {
        const input = document.getElementById('newCategoryInput');
        if (addCategory(input.value)) {
            input.value = '';
            updateCategorySelects();
            renderCategoryList();
        }
    });

    // フィルタ適用
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    applyFilterBtn.addEventListener('click', () => {
        const filterData = {
            from: document.getElementById('filterFromDate').value,
            to: document.getElementById('filterToDate').value,
            category: document.getElementById('filterCategory').value,
            paymentMethod: document.getElementById('filterPaymentMethod').value
        };
        saveFilters(filterData);
        renderExpenseList();
        updateTotalAmount();
        renderSummary();
    });

    // フィルタリセット
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    resetFilterBtn.addEventListener('click', () => {
        document.getElementById('filterFromDate').value = '';
        document.getElementById('filterToDate').value = '';
        document.getElementById('filterCategory').value = 'ALL';
        document.getElementById('filterPaymentMethod').value = 'ALL';
        saveFilters({
            from: '',
            to: '',
            category: 'ALL',
            paymentMethod: 'ALL'
        });
        renderExpenseList();
        updateTotalAmount();
        renderSummary();
    });

    // 全データリセット
    const resetAllBtn = document.getElementById('resetAllBtn');
    resetAllBtn.addEventListener('click', () => {
        if (confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
            localStorage.removeItem('expenseTracker:records');
            localStorage.removeItem('expenseTracker:categories');
            localStorage.removeItem('expenseTracker:filters');
            initializeData();
            updateCategorySelects();
            renderCategoryList();
            renderExpenseList();
            updateTotalAmount();
            renderSummary();
        }
    });

    // 編集フォーム
    const editForm = document.getElementById('editForm');
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(editForm);
        const id = formData.get('id');
        const expenseData = {
            date: formData.get('date'),
            category: formData.get('category'),
            paymentMethod: formData.get('paymentMethod'),
            amount: formData.get('amount'),
            memo: formData.get('memo')
        };

        if (updateExpense(id, expenseData)) {
            closeEditModal();
            renderExpenseList();
            updateTotalAmount();
            renderSummary();
        }
    });

    // モーダルを閉じる
    document.querySelector('.close').addEventListener('click', closeEditModal);
    document.querySelector('.close-modal').addEventListener('click', closeEditModal);
    document.getElementById('editModal').addEventListener('click', (e) => {
        if (e.target.id === 'editModal') {
            closeEditModal();
        }
    });

    // Enterキーでカテゴリ追加
    document.getElementById('newCategoryInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addCategoryBtn.click();
        }
    });
}

// ============================================
// 初期化
// ============================================

/**
 * アプリケーションの初期化
 */
function init() {
    // データの初期化
    initializeData();

    // 日付フィールドのデフォルト値を今日に設定
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('expenseDate').value = today;

    // UIの更新
    updateCategorySelects();
    renderCategoryList();
    renderExpenseList();
    updateTotalAmount();
    renderSummary();

    // フィルタの復元
    const filters = getStorageData('expenseTracker:filters', {
        from: '',
        to: '',
        category: 'ALL',
        paymentMethod: 'ALL'
    });
    document.getElementById('filterFromDate').value = filters.from;
    document.getElementById('filterToDate').value = filters.to;
    document.getElementById('filterCategory').value = filters.category;
    document.getElementById('filterPaymentMethod').value = filters.paymentMethod;

    // イベントリスナーの設定
    setupEventListeners();
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', init);

