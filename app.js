// Configurações Globais
const API_URL = 'https://script.google.com/macros/s/AKfycbzxUb8LfxkzmUdyX6dKzeYno7eqGeZvUOKkYrSRtgLxPlRt-pfITDQbJdsTRQ3XsMPNyw/exec';

// Estado da Aplicação
const state = {
  user: null, // { email: '', name: '', role: 'USER'|'ADMIN' }
  suppliers: [],
  categories: [],
  selectedCategory: null, // null significa "Todos"
  searchQuery: '',
  adminSearchQuery: '',
  isLoading: false
};

// Elementos do DOM
const DOM = {
  // Telas
  screenLogin: document.getElementById('screen-login'),
  screenCatalog: document.getElementById('screen-catalog'),
  screenAdmin: document.getElementById('screen-admin'),
  bottomNav: document.getElementById('app-bottom-nav'),
  
  // Login
  loginForm: document.getElementById('login-form'),
  loginEmail: document.getElementById('login-email'),
  btnLoginSubmit: document.getElementById('btn-login-submit'),
  loginError: document.getElementById('login-error'),
  
  // Catálogo
  welcomeUser: document.getElementById('welcome-user'),
  btnLogout: document.getElementById('btn-logout'),
  btnAdminLogout: document.getElementById('btn-admin-logout'),
  searchInput: document.getElementById('search-input'),
  searchClear: document.getElementById('search-clear'),
  categoryCarousel: document.getElementById('category-carousel'),
  suppliersList: document.getElementById('suppliers-list'),
  
  // Dashboard Admin
  metricSuppliers: document.getElementById('metric-total-suppliers'),
  metricCategories: document.getElementById('metric-total-categories'),
  btnOpenAddSupplier: document.getElementById('btn-open-add-supplier'),
  btnOpenManageCategories: document.getElementById('btn-open-manage-categories'),
  adminSearchInput: document.getElementById('admin-search-input'),
  adminSuppliersList: document.getElementById('admin-suppliers-list'),
  
  // Navegação
  navBtnCatalog: document.getElementById('nav-btn-catalog'),
  navBtnAdmin: document.getElementById('nav-btn-admin'),
  
  // Modais
  modalSupplier: document.getElementById('modal-supplier'),
  modalCategories: document.getElementById('modal-categories'),
  formSupplier: document.getElementById('form-supplier'),
  formAddCategory: document.getElementById('form-add-category'),
  categoryName: document.getElementById('category-name'),
  
  // Campos do Modal Fornecedor
  supplierId: document.getElementById('supplier-id'),
  supplierName: document.getElementById('supplier-name'),
  supplierPhone: document.getElementById('supplier-phone'),
  supplierCategory: document.getElementById('supplier-category'),
  modalSupplierTitle: document.getElementById('modal-supplier-title'),
  
  // Botões Modais
  btnCloseSupplierModal: document.getElementById('btn-close-supplier-modal'),
  btnCancelSupplier: document.getElementById('btn-cancel-supplier'),
  btnSaveSupplier: document.getElementById('btn-save-supplier'),
  btnCloseCategoriesModal: document.getElementById('btn-close-categories-modal'),
  btnSaveCategory: document.getElementById('btn-save-category'),
  categoryModalList: document.getElementById('category-modal-list'),
  
  // Toast
  toast: document.getElementById('app-toast')
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  checkCachedSession();
  initPWAInstallation();
  initCategoryCarouselNavigation();
});

// Registrar o Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker registrado com sucesso:', reg.scope))
      .catch(err => console.error('Erro ao registrar Service Worker:', err));
  });
}

// Inicializar Ouvintes de Evento
function initEventListeners() {
  // Formulário de Login
  DOM.loginForm.addEventListener('submit', handleLogin);
  
  // Logout
  DOM.btnLogout.addEventListener('click', logout);
  DOM.btnAdminLogout.addEventListener('click', logout);
  
  // Navegação de Telas
  DOM.navBtnCatalog.addEventListener('click', () => showScreen('catalog'));
  DOM.navBtnAdmin.addEventListener('click', () => showScreen('admin'));
  
  // Busca
  DOM.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    if (state.searchQuery.length > 0) {
      DOM.searchClear.classList.remove('hidden');
    } else {
      DOM.searchClear.classList.add('hidden');
    }
    renderCatalog();
  });
  
  DOM.searchClear.addEventListener('click', () => {
    DOM.searchInput.value = '';
    state.searchQuery = '';
    DOM.searchClear.classList.add('hidden');
    renderCatalog();
  });
  
  DOM.adminSearchInput.addEventListener('input', (e) => {
    state.adminSearchQuery = e.target.value;
    renderAdminSuppliers();
  });
  
  // Ações do Admin - Modais
  DOM.btnOpenAddSupplier.addEventListener('click', () => openSupplierModal());
  DOM.btnOpenManageCategories.addEventListener('click', () => openCategoriesModal());
  
  DOM.btnCloseSupplierModal.addEventListener('click', closeSupplierModal);
  DOM.btnCancelSupplier.addEventListener('click', closeSupplierModal);
  DOM.btnCloseCategoriesModal.addEventListener('click', closeCategoriesModal);
  
  // Submissão de Formulários Admin
  DOM.formSupplier.addEventListener('submit', handleSupplierSubmit);
  DOM.formAddCategory.addEventListener('submit', handleCategorySubmit);
  
  // Fechar modais ao clicar no overlay
  DOM.modalSupplier.addEventListener('click', (e) => {
    if (e.target === DOM.modalSupplier) closeSupplierModal();
  });
  DOM.modalCategories.addEventListener('click', (e) => {
    if (e.target === DOM.modalCategories) closeCategoriesModal();
  });
}

// Verificar sessão em cache local (localStorage)
function checkCachedSession() {
  const cachedUser = localStorage.getItem('autolist_catalog_user');
  if (cachedUser) {
    try {
      state.user = JSON.parse(cachedUser);
      setupUserEnvironment();
      loadData();
    } catch (e) {
      localStorage.removeItem('autolist_catalog_user');
      showScreen('login');
    }
  } else {
    showScreen('login');
  }
}

// Navegação de Telas
function showScreen(screenId) {
  // Desativar todas as telas
  DOM.screenLogin.classList.remove('active');
  DOM.screenCatalog.classList.remove('active');
  DOM.screenAdmin.classList.remove('active');
  
  // Ativar tela correspondente
  if (screenId === 'login') {
    DOM.screenLogin.classList.add('active');
    DOM.bottomNav.classList.add('hidden');
  } else if (screenId === 'catalog') {
    DOM.screenCatalog.classList.add('active');
    DOM.navBtnCatalog.classList.add('active');
    DOM.navBtnAdmin.classList.remove('active');
    if (state.user && state.user.role === 'ADMIN') {
      DOM.bottomNav.classList.remove('hidden');
    } else {
      DOM.bottomNav.classList.add('hidden');
    }
  } else if (screenId === 'admin') {
    DOM.screenAdmin.classList.add('active');
    DOM.navBtnCatalog.classList.remove('active');
    DOM.navBtnAdmin.classList.add('active');
    DOM.bottomNav.classList.remove('hidden');
  }
}

// Configurar elementos visuais com base no papel do usuário
function setupUserEnvironment() {
  if (state.user) {
    if (state.user.role === 'ADMIN') {
      DOM.welcomeUser.textContent = `Olá, ${state.user.name || 'Admin'}`;
      DOM.navBtnAdmin.classList.remove('hidden');
    } else {
      DOM.welcomeUser.textContent = 'Visitante';
      DOM.navBtnAdmin.classList.add('hidden');
    }
  }
}

// Requisições para o Google Apps Script (Tratamento de CORS e Redirecionamentos)
async function apiCall(params, options = {}) {
  const urlParams = new URLSearchParams(params);
  const fullUrl = `${API_URL}?${urlParams.toString()}`;
  
  // Se for POST, enviamos como text/plain para evitar o pré-vôo OPTIONS do CORS
  // que o Google Apps Script costuma falhar se não configurado perfeitamente.
  if (options.method === 'POST') {
    const fetchOptions = {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
    };
    
    try {
      const response = await fetch(API_URL, fetchOptions);
      if (!response.ok) throw new Error('Falha na resposta do servidor.');
      return await response.json();
    } catch (error) {
      console.error('Erro na requisição POST API:', error);
      throw error;
    }
  }
  
  // Chamada GET normal
  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      mode: 'cors'
    });
    if (!response.ok) throw new Error('Falha na resposta do servidor.');
    return await response.json();
  } catch (error) {
    console.error('Erro na requisição GET API:', error);
    throw error;
  }
}

// Login
async function handleLogin(e) {
  e.preventDefault();
  const email = DOM.loginEmail.value.trim();
  
  if (!email) return;
  
  setLoadingState(DOM.btnLoginSubmit, true);
  DOM.loginError.classList.add('hidden');
  
  try {
    // Tenta validar login no Sheets
    const result = await apiCall({ action: 'login', email: email });
    
    if (result && result.authenticated && result.user && result.user.papel === 'ADMIN') {
      // Usuário administrador
      state.user = {
        email: email,
        name: result.user.nome || 'Administrador',
        role: 'ADMIN'
      };
      showToast(`Bem-vindo, ${state.user.name}!`);
    } else {
      // Visitante comum (e-mail não cadastrado na planilha ou sem papel de ADMIN)
      state.user = {
        email: email,
        name: 'Visitante',
        role: 'USER'
      };
      showToast('Acessando catálogo como visitante...');
    }
    
    // Salva sessão localmente
    localStorage.setItem('autolist_catalog_user', JSON.stringify(state.user));
    
    // Configura interface de acordo com papel do usuário
    setupUserEnvironment();
    
    // Avança para o catálogo e carrega os dados
    showScreen('catalog');
    loadData();
    
  } catch (error) {
    console.warn('Erro ao conectar com a API. Entrando como visitante com dados em cache local, se disponíveis.', error);
    
    // FALLBACK DE SEGURANÇA: Se a API der falha de conexão (CORS/Redirecionamento/Offline),
    // o app acessa como Visitante e exibe aviso de modo limitado, permitindo visualização offline.
    state.user = {
      email: email,
      name: 'Visitante (Limitado)',
      role: 'USER'
    };
    
    localStorage.setItem('autolist_catalog_user', JSON.stringify(state.user));
    setupUserEnvironment();
    showScreen('catalog');
    
    // Tenta carregar dados em cache, ou se falhar exibe mensagem informativa
    loadData(true);
  } finally {
    setLoadingState(DOM.btnLoginSubmit, false);
  }
}

// Logout
function logout() {
  localStorage.removeItem('autolist_catalog_user');
  state.user = null;
  state.suppliers = [];
  state.categories = [];
  state.selectedCategory = null;
  state.searchQuery = '';
  DOM.loginEmail.value = '';
  showScreen('login');
  showToast('Sessão encerrada.');
}

// Carregar Dados da Planilha (Fornecedores e Categorias)
async function loadData(isOfflineFallback = false) {
  renderSkeletons();
  
  try {
    let data;
    if (isOfflineFallback) {
      // Tenta ler do localStorage
      const cachedData = localStorage.getItem('autolist_catalog_data');
      if (cachedData) {
        data = JSON.parse(cachedData);
        showToast('Exibindo dados locais offline.');
      } else {
        throw new Error('Sem dados locais em cache.');
      }
    } else {
      // Chamada HTTP para API
      data = await apiCall({ action: 'get_data' });
      // Salva em cache local para uso futuro/offline
      localStorage.setItem('autolist_catalog_data', JSON.stringify(data));
    }
    
    // Mapeamento de dados recebidos (filtrando cabeçalhos e linhas vazias vindas da planilha)
    state.suppliers = (data.fornecedores || []).filter(s => {
      if (!s.nome) return false;
      const nomeUpper = String(s.nome).trim().toUpperCase();
      const telUpper = String(s.telefone).trim().toUpperCase();
      return nomeUpper !== '' && nomeUpper !== 'NOME' && nomeUpper !== 'NOME_FORNECEDOR' && telUpper !== 'TELEFONE';
    });
    
    state.categories = (data.categorias || []).filter(c => {
      const nome = c.nome !== undefined ? c.nome : c.nome_categoria;
      if (!nome) return false;
      const nomeUpper = String(nome).trim().toUpperCase();
      return nomeUpper !== '' && nomeUpper !== 'NOME' && nomeUpper !== 'NOME_CATEGORIA';
    });
    
    // Atualizar visualizações
    renderCategoryCarousel();
    renderCatalog();
    
    if (state.user && state.user.role === 'ADMIN') {
      updateAdminDashboard();
      renderAdminSuppliers();
      populateCategoryDropdown();
    }
    
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    DOM.suppliersList.innerHTML = `
      <div class="empty-state" style="padding: 20px 10px;">
        <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#FF3B30" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p style="margin-top: 12px; font-weight: 600; color: #FFF; font-size: 15px;">Falha de Integração com o Sheets</p>
        <p style="font-size: 12px; color: var(--text-secondary); margin-top: 6px; line-height: 1.4; max-width: 320px; margin-left: auto; margin-right: auto; text-align: center;">
          A API do Google Sheets está redirecionando para a tela de login do Google. Para corrigir:
        </p>
        <div style="font-size: 11px; color: var(--text-secondary); text-align: left; max-width: 320px; margin: 12px auto; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--border-color); line-height: 1.4;">
          1. No Apps Script, clique em <strong>Implantar &gt; Gerenciar implantações</strong>.<br>
          2. Edite a implantação ativa (ícone de lápis).<br>
          3. Mude <strong>Executar como</strong> para <strong>"Eu"</strong>.<br>
          4. Mude <strong>Quem tem acesso</strong> para <strong>"Qualquer pessoa"</strong> (mesmo anônima).<br>
          5. Clique em <strong>Implantar</strong> para salvar.
        </div>
        <button class="btn btn-secondary" style="margin-top: 8px; height: 38px; font-size: 13px; max-width: 200px; margin-left: auto; margin-right: auto;" onclick="loadData()">Tentar Novamente</button>
      </div>
    `;
    showToast('Erro de permissão ou CORS na planilha.');
  }
}

// Renderizar Skeleton Loaders adaptados ao novo grid
function renderSkeletons() {
  let skeletonsHtml = '';
  for (let i = 0; i < 6; i++) {
    skeletonsHtml += `
      <div class="skeleton-card">
        <div class="skeleton-visual skeleton-text"></div>
        <div class="skeleton-info">
          <div class="skeleton-text skeleton-title"></div>
          <div class="skeleton-footer" style="display:flex; justify-content:space-between; align-items:center; margin-top:auto;">
            <div class="skeleton-text skeleton-subtitle" style="width: 80px; height: 12px;"></div>
            <div class="skeleton-text skeleton-button" style="width: 36px; height: 36px; border-radius: var(--radius-md);"></div>
          </div>
        </div>
      </div>
    `;
  }
  DOM.suppliersList.innerHTML = skeletonsHtml;
}

// Renderizar Carrossel Horizontal de Categorias (Pills estilizadas como mini cards)
function renderCategoryCarousel() {
  let carouselHtml = `
    <button class="category-pill ${state.selectedCategory === null ? 'active' : ''}" data-id="all">
      <span class="category-icon">📦</span>
      <span class="category-name">Todos</span>
    </button>
  `;
  
  state.categories.forEach(cat => {
    const catId = cat.id !== undefined ? cat.id : cat.id_categoria;
    const catName = cat.nome !== undefined ? cat.nome : cat.nome_categoria;
    const catIcon = getCategoryIcon(catName);
    
    carouselHtml += `
      <button class="category-pill ${state.selectedCategory === String(catId) ? 'active' : ''}" data-id="${catId}">
        <span class="category-icon">${catIcon}</span>
        <span class="category-name">${catName}</span>
      </button>
    `;
  });
  
  DOM.categoryCarousel.innerHTML = carouselHtml;
  
  // Event listeners para as pílulas de filtro
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      // Feedback táctil suave no clique
      if (window.navigator.vibrate) window.navigator.vibrate(10);
      
      const button = e.currentTarget;
      const id = button.getAttribute('data-id');
      if (id === 'all') {
        state.selectedCategory = null;
      } else {
        state.selectedCategory = id;
      }
      
      // Atualizar pílulas ativas
      document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
      button.classList.add('active');
      
      renderCatalog();
    });
  });
}

// Obter nome da categoria a partir do ID
function getCategoryName(catId) {
  const cat = state.categories.find(c => {
    const id = c.id !== undefined ? c.id : c.id_categoria;
    return String(id) === String(catId);
  });
  return cat ? (cat.nome !== undefined ? cat.nome : cat.nome_categoria) : 'Outros';
}

// Renderizar a Lista de Fornecedores do Catálogo
function renderCatalog() {
  // Filtrar fornecedores válidos
  let filtered = state.suppliers.filter(supplier => {
    // 1. Filtrar registros excluídos logicamente (status falso)
    // Na planilha pode vir como boolean false ou string 'false' ou 'FALSO'
    const status = String(supplier.status).toUpperCase();
    if (status === 'FALSO' || status === 'FALSE' || supplier.status === false) {
      return false;
    }
    
    // 2. Filtrar por Categoria selecionada
    if (state.selectedCategory !== null) {
      if (String(supplier.id_categoria) !== String(state.selectedCategory)) {
        return false;
      }
    }
    
    // 3. Filtrar por busca (Nome do fornecedor ou nome da categoria)
    if (state.searchQuery.trim() !== '') {
      const q = state.searchQuery.toLowerCase();
      const name = String(supplier.nome).toLowerCase();
      const catName = getCategoryName(supplier.id_categoria).toLowerCase();
      if (!name.includes(q) && !catName.includes(q)) {
        return false;
      }
    }
    
    return true;
  });
  
  if (filtered.length === 0) {
    DOM.suppliersList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="var(--text-secondary)" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <p>Nenhum fornecedor encontrado.</p>
      </div>
    `;
    return;
  }
  
  let listHtml = '';
  filtered.forEach(supplier => {
    const categoryName = getCategoryName(supplier.id_categoria);
    // Limpar telefone tirando caracteres não numéricos para o link tel:
    const cleanPhone = String(supplier.telefone).replace(/\D/g, '');
    const gradient = getDynamicGradient(supplier.nome);
    const initials = getInitials(supplier.nome);
    
    listHtml += `
      <div class="supplier-card" data-id="${supplier.id}">
        <div class="card-visual-header" style="background: ${gradient}">
          <div class="card-avatar">${initials}</div>
          <span class="supplier-category-badge">${categoryName}</span>
        </div>
        <div class="card-info-content">
          <span class="supplier-name">${supplier.nome}</span>
          <div class="card-footer-info">
            <span class="supplier-phone">${formatPhoneNumber(supplier.telefone)}</span>
            <a href="tel:${cleanPhone}" class="btn-call-action" aria-label="Chamar ${supplier.nome}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
    `;
  });
  
  DOM.suppliersList.innerHTML = listHtml;
  
  // Adiciona efeito de toque (card selecionado)
  document.querySelectorAll('.supplier-card').forEach(card => {
    card.addEventListener('touchstart', () => card.classList.add('selected'));
    card.addEventListener('touchend', () => card.classList.remove('selected'));
  });
}

// Formatar Telefone (ex: 31999998888 -> (31) 99999-8888)
function formatPhoneNumber(phone) {
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  } else if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
}

// -------------------------------------------------------------
// DASHBOARD ADMINISTRATIVA & CRUD
// -------------------------------------------------------------

// Atualizar cartões de métricas da Dashboard
function updateAdminDashboard() {
  const activeSuppliers = state.suppliers.filter(s => {
    const status = String(s.status).toUpperCase();
    return status !== 'FALSO' && status !== 'FALSE' && s.status !== false;
  }).length;
  
  DOM.metricSuppliers.textContent = activeSuppliers;
  DOM.metricCategories.textContent = state.categories.length;
}

// Renderizar a lista de fornecedores com ações do Admin (Editar/Excluir)
function renderAdminSuppliers() {
  let filtered = state.suppliers.filter(supplier => {
    const status = String(supplier.status).toUpperCase();
    if (status === 'FALSO' || status === 'FALSE' || supplier.status === false) {
      return false; // Não exibir soft-deleted
    }
    
    if (state.adminSearchQuery.trim() !== '') {
      const q = state.adminSearchQuery.toLowerCase();
      const name = String(supplier.nome).toLowerCase();
      const catName = getCategoryName(supplier.id_categoria).toLowerCase();
      if (!name.includes(q) && !catName.includes(q)) {
        return false;
      }
    }
    return true;
  });
  
  if (filtered.length === 0) {
    DOM.adminSuppliersList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary); font-size:13px;">Nenhum fornecedor cadastrado.</div>';
    return;
  }
  
  let listHtml = '';
  filtered.forEach(supplier => {
    const categoryName = getCategoryName(supplier.id_categoria);
    
    listHtml += `
      <div class="admin-supplier-card" data-id="${supplier.id}">
        <div class="card-details">
          <span class="supplier-name" style="font-size: 14px;">${supplier.nome}</span>
          <span class="supplier-phone" style="font-size: 11px;">${categoryName} • ${formatPhoneNumber(supplier.telefone)}</span>
        </div>
        <div class="admin-card-actions">
          <button class="btn-action edit" onclick="editSupplier(${supplier.id})" aria-label="Editar">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <button class="btn-action delete" onclick="confirmDeleteSupplier(${supplier.id})" aria-label="Excluir">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  });
  
  DOM.adminSuppliersList.innerHTML = listHtml;
}

// Preencher Dropdown de Categoria no Modal do Fornecedor
function populateCategoryDropdown() {
  let selectHtml = '<option value="" disabled selected>Selecione uma categoria...</option>';
  
  state.categories.forEach(cat => {
    const catId = cat.id !== undefined ? cat.id : cat.id_categoria;
    const catName = cat.nome !== undefined ? cat.nome : cat.nome_categoria;
    
    selectHtml += `<option value="${catId}">${catName}</option>`;
  });
  
  DOM.supplierCategory.innerHTML = selectHtml;
}

// Gerenciamento de Modal: Fornecedor (Adicionar/Editar)
function openSupplierModal(supplier = null) {
  populateCategoryDropdown();
  
  if (supplier) {
    // Modo Edição
    DOM.modalSupplierTitle.textContent = 'Editar Fornecedor';
    DOM.supplierId.value = supplier.id;
    DOM.supplierName.value = supplier.nome;
    DOM.supplierPhone.value = supplier.telefone;
    DOM.supplierCategory.value = supplier.id_categoria;
  } else {
    // Modo Adição
    DOM.modalSupplierTitle.textContent = 'Adicionar Fornecedor';
    DOM.supplierId.value = '';
    DOM.formSupplier.reset();
  }
  
  DOM.modalSupplier.classList.add('active');
}

function closeSupplierModal() {
  DOM.modalSupplier.classList.remove('active');
}

// Submeter Formulário de Fornecedor (Inserir / Atualizar)
async function handleSupplierSubmit(e) {
  e.preventDefault();
  
  const id = DOM.supplierId.value;
  const name = DOM.supplierName.value.trim().toUpperCase();
  const phone = DOM.supplierPhone.value.trim().replace(/\D/g, ''); // Apenas números
  const categoryId = DOM.supplierCategory.value;
  
  if (!name || !phone || !categoryId) {
    showToast('Preencha todos os campos corretamente.');
    return;
  }
  
  setLoadingState(DOM.btnSaveSupplier, true);
  
  const isEdit = id !== '';
  const action = isEdit ? 'edit_fornecedor' : 'add_fornecedor';
  
  const payload = {
    action: action,
    nome: name,
    telefone: phone,
    id_categoria: parseInt(categoryId)
  };
  
  if (isEdit) {
    payload.id = parseInt(id);
  }
  
  try {
    const result = await apiCall({}, {
      method: 'POST',
      body: payload
    });
    
    if (result && (result.success || result.status === 'success')) {
      showToast(isEdit ? 'Fornecedor atualizado com sucesso!' : 'Fornecedor cadastrado com sucesso!');
      closeSupplierModal();
      loadData(); // Recarrega os dados da planilha
    } else {
      throw new Error(result.message || 'Falha ao salvar fornecedor.');
    }
  } catch (error) {
    showToast('Erro ao salvar dados. Verifique a conexão.');
    console.error(error);
  } finally {
    setLoadingState(DOM.btnSaveSupplier, false);
  }
}

// Aciona edição externa (chamada de escopo global pelos botões de card inline)
window.editSupplier = function(id) {
  const supplier = state.suppliers.find(s => Number(s.id) === Number(id));
  if (supplier) {
    openSupplierModal(supplier);
  }
};

// Confirmar e Executar Exclusão Lógica (Soft-delete)
window.confirmDeleteSupplier = async function(id) {
  const supplier = state.suppliers.find(s => Number(s.id) === Number(id));
  if (!supplier) return;
  
  const confirmed = await showCustomConfirm("Excluir Fornecedor", `Deseja realmente remover o fornecedor "${supplier.nome}"?`);
  if (confirmed) {
    showToast('Removendo...');
    
    try {
      const result = await apiCall({}, {
        method: 'POST',
        body: {
          action: 'delete_fornecedor',
          id: parseInt(id)
        }
      });
      
      if (result && (result.success || result.status === 'success')) {
        showToast('Fornecedor removido com sucesso!');
        loadData();
      } else {
        throw new Error(result.message || 'Falha ao remover fornecedor.');
      }
    } catch (error) {
      showToast('Erro ao excluir. Tente novamente.');
      console.error(error);
    }
  }
};

// Gerenciamento de Modal: Categorias
function openCategoriesModal() {
  renderCategoryModalList();
  DOM.modalCategories.classList.add('active');
}

function closeCategoriesModal() {
  DOM.modalCategories.classList.remove('active');
  // Se fechou modal de categorias, recarrega dropdown do fornecedor caso esteja aberto por baixo
  populateCategoryDropdown();
}

// Renderizar Categorias no modal com botões de ação (Editar/Excluir)
function renderCategoryModalList() {
  let listHtml = '';
  
  // Ignorar o cabeçalho "nome_categoria" ou vazio da planilha se ele vier da primeira linha
  const filteredCats = state.categories.filter(cat => {
    const catName = cat.nome !== undefined ? cat.nome : cat.nome_categoria;
    return catName && catName !== 'nome_categoria' && catName.trim() !== '';
  });
  
  if (filteredCats.length === 0) {
    listHtml = '<li class="category-modal-item">Nenhuma categoria cadastrada.</li>';
  } else {
    filteredCats.forEach(cat => {
      const catId = cat.id !== undefined ? cat.id : cat.id_categoria;
      const catName = cat.nome !== undefined ? cat.nome : cat.nome_categoria;
      listHtml += `
        <li class="category-modal-item">
          <span>${catName}</span>
          <div class="category-item-actions">
            <button class="btn-action edit" onclick="editCategory(${catId})" aria-label="Editar Categoria">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
            <button class="btn-action delete" onclick="deleteCategory(${catId})" aria-label="Excluir Categoria">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </li>
      `;
    });
  }
  
  DOM.categoryModalList.innerHTML = listHtml;
}

// Adicionar Nova Categoria
async function handleCategorySubmit(e) {
  e.preventDefault();
  
  const name = DOM.categoryName.value.trim();
  if (!name) return;
  
  setLoadingState(DOM.btnSaveCategory, true);
  
  try {
    const result = await apiCall({}, {
      method: 'POST',
      body: {
        action: 'add_categoria',
        nome_categoria: name
      }
    });
    
    if (result && (result.success || result.status === 'success')) {
      showToast('Categoria criada com sucesso!');
      DOM.categoryName.value = '';
      
      // Recarrega todos os dados para sincronizar estados
      await loadData();
      renderCategoryModalList();
    } else {
      throw new Error(result.message || 'Falha ao salvar categoria.');
    }
  } catch (error) {
    showToast('Erro ao criar categoria. Tente novamente.');
    console.error(error);
  } finally {
    setLoadingState(DOM.btnSaveCategory, false);
  }
}

// Editar Categoria
window.editCategory = async function(id) {
  const cat = state.categories.find(c => {
    const catId = c.id !== undefined ? c.id : c.id_categoria;
    return Number(catId) === Number(id);
  });
  if (!cat) return;
  
  const catName = cat.nome !== undefined ? cat.nome : cat.nome_categoria;
  const newName = await showCustomPrompt("Editar Categoria", "Nome da Categoria", catName);
  
  if (newName === null) return; // Cancelado
  const trimmed = newName.trim();
  if (trimmed === "" || trimmed === catName) return;
  
  showToast('Salvando...');
  
  try {
    const result = await apiCall({}, {
      method: 'POST',
      body: {
        action: 'edit_categoria',
        id: parseInt(id),
        nome_categoria: trimmed
      }
    });
    
    if (result && (result.success || result.status === 'success')) {
      showToast('Categoria editada com sucesso!');
      await loadData();
      renderCategoryModalList();
    } else {
      throw new Error(result.message || 'Falha ao editar categoria.');
    }
  } catch (error) {
    showToast('Erro ao editar categoria.');
    console.error(error);
  }
};

// Excluir Categoria (Remoção física)
window.deleteCategory = async function(id) {
  const cat = state.categories.find(c => {
    const catId = c.id !== undefined ? c.id : c.id_categoria;
    return Number(catId) === Number(id);
  });
  if (!cat) return;
  
  const catName = cat.nome !== undefined ? cat.nome : cat.nome_categoria;
  
  const confirmed = await showCustomConfirm(
    "Excluir Categoria",
    `Deseja realmente excluir a categoria "${catName}"?\nOs fornecedores vinculados a ela não serão excluídos, mas poderão ficar sem categoria.`
  );
  if (confirmed) {
    showToast('Excluindo...');
    
    try {
      const result = await apiCall({}, {
        method: 'POST',
        body: {
          action: 'delete_categoria',
          id: parseInt(id)
        }
      });
      
      if (result && (result.success || result.status === 'success')) {
        showToast('Categoria excluída com sucesso!');
        await loadData();
        renderCategoryModalList();
      } else {
        throw new Error(result.message || 'Falha ao excluir categoria.');
      }
    } catch (error) {
      showToast('Erro ao excluir categoria. Tente novamente.');
      console.error(error);
    }
  }
};

// -------------------------------------------------------------
// UTILS
// -------------------------------------------------------------

// Gerenciar carregamento visual nos botões
function setLoadingState(buttonEl, isLoading) {
  const textEl = buttonEl.querySelector('.btn-text');
  const loaderEl = buttonEl.querySelector('.btn-loader');
  
  if (isLoading) {
    buttonEl.disabled = true;
    if (textEl) textEl.classList.add('hidden');
    if (loaderEl) loaderEl.classList.remove('hidden');
  } else {
    buttonEl.disabled = false;
    if (textEl) textEl.classList.remove('hidden');
    if (loaderEl) loaderEl.classList.add('hidden');
  }
}

// Exibir Notificação Toast Flutuante
function showToast(message, duration = 3000) {
  const toastMessage = DOM.toast.querySelector('.toast-message');
  toastMessage.textContent = message;
  
  DOM.toast.classList.add('active');
  
  // Vibrar dispositivo se disponível para feedbacks importantes
  if (window.navigator.vibrate) {
    window.navigator.vibrate(20);
  }
  
  // Limpar timer existente
  if (DOM.toast.timeoutId) {
    clearTimeout(DOM.toast.timeoutId);
  }
  
  DOM.toast.timeoutId = setTimeout(() => {
    DOM.toast.classList.remove('active');
  }, duration);
}

// Obter iniciais do nome do fornecedor (ex: CASA DOS IMPORTADOS -> CI)
function getInitials(name) {
  if (!name) return 'AL';
  const cleanName = name.replace(/[^\w\s]/gi, '').trim(); // Remove caracteres especiais
  const words = cleanName.split(/\s+/).filter(w => w.length > 1); // Ignora preposições como "de", "e", "do"
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

// Gerar um gradiente determinístico moderno a partir do nome do fornecedor
function getDynamicGradient(name) {
  const gradients = [
    'linear-gradient(135deg, #007AFF 0%, #00C6FF 100%)', // Electric Blue
    'linear-gradient(135deg, #FF3B30 0%, #FF9500 100%)', // Sunset Fire
    'linear-gradient(135deg, #AF52DE 0%, #FF2D55 100%)', // Purple Rose
    'linear-gradient(135deg, #34C759 0%, #00D2C4 100%)', // Emerald Teal
    'linear-gradient(135deg, #5856D6 0%, #007AFF 100%)', // Indigo Neon
    'linear-gradient(135deg, #FF9500 0%, #FFCC00 100%)', // Amber Gold
    'linear-gradient(135deg, #535875 0%, #1A1E36 100%)', // Carbon Dark
    'linear-gradient(135deg, #FF2D55 0%, #FF3B30 100%)'  // Crimson Pink
  ];
  
  if (!name) return gradients[0];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

// Obter ícone/emoji representativo para a categoria automotiva
function getCategoryIcon(name) {
  const n = String(name).toLowerCase();
  if (n === 'all' || n === 'todos') return '📦';
  if (n.includes('importado')) return '🏎️';
  if (n.includes('nacional') || n.includes('multimarcas')) return '🚗';
  if (n.includes('fiat') || n.includes('volks') || n.includes('ford') || n.includes('chevrolet') || n.includes('toyota') || n.includes('honda') || n.includes('renault') || n.includes('nissan') || n.includes('hyundai')) return '🚙';
  if (n.includes('radiador')) return '🌡️';
  if (n.includes('lataria') || n.includes('para-lama')) return '🛡️';
  if (n.includes('vidro') || n.includes('para-brisa') || n.includes('lanterna') || n.includes('farol')) return '🪟';
  if (n.includes('acessório') || n.includes('som') || n.includes('alarme')) return '🎛️';
  if (n.includes('frete') || n.includes('caminhão') || n.includes('caminhonete') || n.includes('pickup')) return '🛻';
  if (n.includes('peça') || n.includes('variado') || n.includes('original')) return '⚙️';
  return '🔧';
}

// Exibir Confirmação Customizada (Modal)
function showCustomConfirm(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-confirm');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const btnCancel = document.getElementById('btn-confirm-cancel');
    const btnOk = document.getElementById('btn-confirm-ok');
    
    titleEl.textContent = title;
    msgEl.textContent = message;
    
    modal.classList.add('active');
    
    function cleanup(value) {
      modal.classList.remove('active');
      btnCancel.removeEventListener('click', onCancel);
      btnOk.removeEventListener('click', onOk);
      resolve(value);
    }
    
    function onCancel() { cleanup(false); }
    function onOk() { cleanup(true); }
    
    btnCancel.addEventListener('click', onCancel);
    btnOk.addEventListener('click', onOk);
  });
}

// Exibir Prompt Customizado (Modal)
function showCustomPrompt(title, label, defaultValue = '') {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-prompt');
    const titleEl = document.getElementById('prompt-title');
    const labelEl = document.getElementById('prompt-label');
    const inputEl = document.getElementById('prompt-input');
    const btnCancel = document.getElementById('btn-prompt-cancel');
    const form = document.getElementById('form-prompt');
    
    titleEl.textContent = title;
    labelEl.textContent = label;
    inputEl.value = defaultValue;
    
    modal.classList.add('active');
    
    // Pequeno timeout para dar foco ao input depois que a animação iniciar
    setTimeout(() => inputEl.focus(), 150);
    
    function cleanup(value) {
      modal.classList.remove('active');
      btnCancel.removeEventListener('click', onCancel);
      form.removeEventListener('submit', onSubmit);
      resolve(value);
    }
    
    function onCancel() { cleanup(null); }
    function onSubmit(e) { 
      e.preventDefault();
      cleanup(inputEl.value.trim()); 
    }
    
    btnCancel.addEventListener('click', onCancel);
    form.addEventListener('submit', onSubmit);
  });
}

// Inicialização e controle de instalação do PWA (Android e iOS)
let deferredPrompt;
function initPWAInstallation() {
  const banner = document.getElementById('pwa-install-banner');
  const btnInstall = document.getElementById('btn-pwa-install');
  const btnClose = document.getElementById('btn-pwa-close');
  const descText = document.getElementById('pwa-install-desc');

  if (!banner) return;

  // Verificar se o app já está rodando em modo Standalone (instalado)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isStandalone) {
    return; // Se já está instalado, não exibe nada
  }

  // Detectar se é iOS (iPhone/iPad)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  // Detectar se o banner já foi rejeitado nesta sessão
  const isDismissed = sessionStorage.getItem('pwa-banner-dismissed');
  if (isDismissed) {
    return;
  }

  // Se for iOS e não standalone, exibe o banner com instruções de compartilhamento
  if (isIOS) {
    descText.innerHTML = 'Toque no botão de compartilhar <span style="font-size:16px;">⎋</span> do Safari e selecione <strong>Adicionar à Tela de Início</strong>.';
    btnInstall.textContent = 'Ok, entendi';
    btnInstall.addEventListener('click', () => {
      banner.classList.add('hidden');
      sessionStorage.setItem('pwa-banner-dismissed', 'true');
    });
    
    // Exibe após 3 segundos
    setTimeout(() => {
      banner.classList.remove('hidden');
    }, 3000);
  }

  // Ouvinte para Android/Chrome (e navegadores que suportam beforeinstallprompt)
  window.addEventListener('beforeinstallprompt', (e) => {
    // Impedir que o Chrome exiba o mini-infobar padrão
    e.preventDefault();
    // Salva o evento para ser disparado posteriormente
    deferredPrompt = e;
    
    // Exibir o banner após 3 segundos
    setTimeout(() => {
      banner.classList.remove('hidden');
    }, 3000);
  });

  btnInstall.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    // Exibir o prompt nativo de instalação
    deferredPrompt.prompt();
    // Aguardar a resposta do usuário
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // Limpar o prompt salvo
    deferredPrompt = null;
    // Ocultar o banner
    banner.classList.add('hidden');
  });

  btnClose.addEventListener('click', () => {
    banner.classList.add('hidden');
    // Guardar na sessão que o usuário fechou o banner para não incomodar nesta navegação
    sessionStorage.setItem('pwa-banner-dismissed', 'true');
  });
}

// Lógica de navegação aprimorada para o carrossel de categorias no Desktop
function initCategoryCarouselNavigation() {
  const slider = document.querySelector('.category-carousel-wrapper');
  if (!slider) return;

  let isDown = false;
  let startX;
  let scrollLeft;

  // 1. Converter scroll vertical da roda do mouse em scroll horizontal
  slider.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      slider.scrollLeft += e.deltaY * 1.2; // Velocidade suave
    }
  });

  // 2. Navegação por arrasto com o mouse (Drag-to-Scroll)
  slider.addEventListener('mousedown', (e) => {
    isDown = true;
    slider.classList.add('grabbing');
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
  });

  slider.addEventListener('mouseleave', () => {
    isDown = false;
    slider.classList.remove('grabbing');
  });

  slider.addEventListener('mouseup', () => {
    isDown = false;
    slider.classList.remove('grabbing');
  });

  slider.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 2.5; // Ajuste de sensibilidade de arrasto
    slider.scrollLeft = scrollLeft - walk;
  });
}
