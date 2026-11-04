import {
  UserProfile,
  FolderSummary,
  VaultItemSummary,
  SetupMasterPasswordRequest,
  RecoverVaultRequest,
  RotateRecoveryKeyRequest,
  UpdateProfileRequest,
  RegisterRequest,
  SecureSendSummary,
  CreateSendRequest,
  PublicSendResponse,
  ApiResponse,
} from '@pwm/shared';

const API_BASE = '/api';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
      },
      credentials: 'include',
    });

    const data: ApiResponse<T> = await res.json().catch(() => ({
      success: false,
      error: 'NETWORK_ERROR',
      message: 'Failed to parse response from server',
    }));

    if (!res.ok || !data.success) {
      const err = new Error(data.message || data.error || `HTTP error ${res.status}`);
      (err as any).code = data.error;
      (err as any).status = res.status;
      throw err;
    }

    return data.data as T;
  }

  // Auth Endpoints
  async getAuthConfig() {
    return this.request<{ googleConfigured: boolean; googleClientId: string | null; emailConfigured?: boolean }>('/auth/config');
  }

  async register(data: RegisterRequest) {
    return this.request<{ email: string; devVerificationToken?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyEmail(token: string) {
    return this.request<{ user: UserProfile; token: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async resendVerification(email: string) {
    return this.request<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async loginWithGoogle(idToken: string) {
    return this.request<{ user: UserProfile; token: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  }

  async devLogin(email: string, name: string) {
    return this.request<{ user: UserProfile; token: string }>('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    });
  }

  async getCurrentUser() {
    return this.request<{ user: UserProfile & { vaultId: string; keyMetadata: any } }>('/auth/me');
  }

  async logout() {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  }

  async updateProfile(data: UpdateProfileRequest) {
    return this.request<{ user: UserProfile }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Vault Keys & Master Password
  async setupMasterPassword(req: SetupMasterPasswordRequest) {
    return this.request<{ vaultId: string; keyMetadata: any }>('/vault/setup-master-password', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async getVaultKeys() {
    return this.request<{
      vaultId: string;
      encryptedVaultKey: string;
      masterPasswordSalt: string;
      kdfAlgorithm: string;
      kdfParameters: any;
      recoveryWrappedVaultKey: string;
      hint?: string;
    }>('/vault/keys');
  }

  async recoverVault(req: RecoverVaultRequest) {
    return this.request<{ message: string }>('/vault/recover', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async rotateRecoveryKey(req: RotateRecoveryKeyRequest) {
    return this.request<{ message: string }>('/vault/rotate-recovery-key', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // Folders
  async getFolders() {
    return this.request<FolderSummary[]>('/folders');
  }

  async createFolder(name: string) {
    return this.request<FolderSummary>('/folders', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async renameFolder(id: string, name: string) {
    return this.request<FolderSummary>(`/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteFolder(id: string) {
    return this.request<{ message: string }>(`/folders/${id}`, {
      method: 'DELETE',
    });
  }

  // Vault Items
  async getItems(params?: { filter?: string; folderId?: string; search?: string }) {
    const q = new URLSearchParams();
    if (params?.filter) q.append('filter', params.filter);
    if (params?.folderId) q.append('folderId', params.folderId);
    if (params?.search) q.append('search', params.search);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<VaultItemSummary[]>(`/items${qs}`);
  }

  async getItem(id: string) {
    return this.request<VaultItemSummary>(`/items/${id}`);
  }

  async createItem(item: {
    itemName: string;
    itemType: string;
    encryptedPayload: string;
    folderId?: string | null;
    isFavorite?: boolean;
    isArchived?: boolean;
  }) {
    return this.request<VaultItemSummary>('/items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateItem(
    id: string,
    item: {
      itemName: string;
      itemType?: string;
      encryptedPayload: string;
      folderId?: string | null;
      isFavorite?: boolean;
      isArchived?: boolean;
    }
  ) {
    return this.request<VaultItemSummary>(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  }

  async toggleFavorite(id: string) {
    return this.request<{ id: string; isFavorite: boolean }>(`/items/${id}/favorite`, {
      method: 'PATCH',
    });
  }

  async archiveItem(id: string) {
    return this.request<{ id: string; isArchived: boolean }>(`/items/${id}/archive`, {
      method: 'PATCH',
    });
  }

  async restoreArchiveItem(id: string) {
    return this.request<{ id: string; isArchived: boolean }>(`/items/${id}/restore-archive`, {
      method: 'PATCH',
    });
  }

  async moveItemToTrash(id: string) {
    return this.request<{ id: string; deletedAt: string }>(`/items/${id}/trash`, {
      method: 'PATCH',
    });
  }

  async restoreItemFromTrash(id: string) {
    return this.request<{ id: string; deletedAt: null }>(`/items/${id}/restore-trash`, {
      method: 'PATCH',
    });
  }

  async permanentlyDeleteItem(id: string) {
    return this.request<{ message: string }>(`/items/${id}`, {
      method: 'DELETE',
    });
  }

  // Day 2: Secure Send Endpoints
  async getSends(params?: { type?: string; search?: string }) {
    const q = new URLSearchParams();
    if (params?.type) q.append('type', params.type);
    if (params?.search) q.append('search', params.search);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<SecureSendSummary[]>(`/send${qs}`);
  }

  async createTextSend(req: CreateSendRequest) {
    return this.request<{ id: string; publicToken: string; name: string; expiresAt: string }>(
      '/send/text',
      {
        method: 'POST',
        body: JSON.stringify(req),
      }
    );
  }

  async createFileSend(formData: FormData) {
    return this.request<{ id: string; publicToken: string; name: string; expiresAt: string; fileInfo: any }>(
      '/send/file',
      {
        method: 'POST',
        body: formData,
      }
    );
  }

  async revokeSend(id: string) {
    return this.request<{ id: string; revokedAt: string }>(`/send/${id}/revoke`, {
      method: 'PATCH',
    });
  }

  async deleteSend(id: string) {
    return this.request<{ message: string }>(`/send/${id}`, {
      method: 'DELETE',
    });
  }

  // Public Recipient Endpoints
  async getPublicSend(token: string) {
    return this.request<PublicSendResponse>(`/send/public/${token}`);
  }

  async verifySendPassword(token: string, password: string) {
    return this.request<{ encryptedPayload?: string; fileInfo?: any }>(
      `/send/public/${token}/verify-password`,
      {
        method: 'POST',
        body: JSON.stringify({ password }),
      }
    );
  }

  async verifySendEmail(token: string, email: string) {
    return this.request<{ encryptedPayload?: string; fileInfo?: any }>(
      `/send/public/${token}/verify-email`,
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
  }

  getPublicSendDownloadUrl(token: string) {
    return `${API_BASE}/send/public/${token}/download`;
  }
}

export const api = new ApiService();
