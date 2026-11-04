<template>
    <div class="upload-page">
        <div class="upload-container">
            <router-link v-if="isAdmin" to="/admin/books" class="admin-entry">管理后台 →</router-link>
          
            <div class="upload-cards">
                <router-link to="/user/upload/upload-illustration" class="upload-card">
                    <el-card class="card" shadow="hover">
                        <div class="card-content">
                            <div class="icon-wrapper">
                                <el-icon class="card-icon"><UploadPictureIcon /></el-icon>
                            </div>
                            <h3 class="card-title">{{ $t('upload.uploadIllustration') }}</h3>
                            <p class="card-desc">{{ $t('upload.uploadIllustrationDesc') }}</p>
                        </div>
                    </el-card>
                </router-link>
                <router-link to="/user/upload/upload-local-book" class="upload-card">
                    <el-card class="card" shadow="hover">
                        <div class="card-content">
                            <div class="icon-wrapper">
                                <el-icon class="card-icon"><UploadReadingIcon /></el-icon>
                            </div>
                            <h3 class="card-title">{{ $t('upload.uploadBook') }}</h3>
                            <p class="card-desc">{{ $t('upload.uploadBookDesc') }}</p>
                            <BookUploadReward compact />
                        </div>
                    </el-card>
                </router-link>
                <router-link
                    v-if="isAdmin"
                    to="/user/upload/style-prompt"
                    class="upload-card"
                >
                    <el-card class="card" shadow="hover">
                        <div class="card-content">
                            <div class="icon-wrapper">
                                <el-icon class="card-icon"><BrushIcon /></el-icon>
                            </div>
                            <h3 class="card-title">{{ $t('upload.uploadStylePrompt') }}</h3>
                            <p class="card-desc">{{ $t('upload.uploadStylePromptDesc') }}</p>
                        </div>
                    </el-card>
                </router-link>
                <router-link
                    v-if="isAdmin"
                    to="/user/upload/website-recommendations"
                    class="upload-card"
                >
                    <el-card class="card" shadow="hover">
                        <div class="card-content">
                            <div class="icon-wrapper">
                                <el-icon class="card-icon"><LinkIcon /></el-icon>
                            </div>
                            <h3 class="card-title">{{ $t('upload.uploadWebsiteReco') }}</h3>
                            <p class="card-desc">{{ $t('upload.uploadWebsiteRecoDesc') }}</p>
                        </div>
                    </el-card>
                </router-link>
            </div>
        </div>
    </div>
</template>

<script>
import { Picture as UploadPictureIcon, Reading as UploadReadingIcon, Brush as BrushIcon, Link as LinkIcon } from '@element-plus/icons-vue'
import { isCurrentUserAdmin } from '@/utils/auth'
import BookUploadReward from '@/components/BookUploadReward.vue'

export default {
  name: 'UploadPage',
  components: {
    BookUploadReward,
    UploadPictureIcon,
    UploadReadingIcon,
    BrushIcon,
    LinkIcon,
  },
  computed: {
    isAdmin() {
      return isCurrentUserAdmin()
    },
  },
}
</script>

<style scoped>
.upload-page {
    min-height: calc(100vh - 50px - 40px);
    background-color: #f5f7fa;
    padding: 40px 20px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.admin-entry { display: block; margin-bottom: 20px; color: #765a9e; text-align: right; font-weight: 600; text-decoration: none; }

.upload-container {
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
}


.upload-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 24px;
    width: 100%;
}

.upload-card {
    text-decoration: none;
    display: block;
    height: 100%;
    transition: transform 0.2s ease;
}

.upload-card:hover {
    transform: translateY(-4px);
}

.card {
    height: 100%;
    min-height: 280px;
    border-radius: 12px;
    transition: all 0.2s ease;
    cursor: pointer;
}

.card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

.card :deep(.el-card__body) {
    height: 100%;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.card-content {
    width: 100%;
    height: 100%;
    min-height: 280px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 32px;
    text-align: center;
}

.icon-wrapper {
    width: 72px;
    height: 72px;
    border-radius: 12px;
    background: linear-gradient(135deg, #8167a9 0%, #9d8bb8 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
    transition: all 0.2s ease;
}

.upload-card:nth-child(2) .icon-wrapper {
    background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
}

.card-icon {
    font-size: 36px;
    color: #fff;
}

.card-title {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 12px 0;
    color: #303133;
    line-height: 1.4;
}

.card-desc {
    font-size: 14px;
    margin: 0;
    color: #909399;
    text-align: center;
    line-height: 1.6;
}

.upload-card:hover .icon-wrapper {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(129, 103, 169, 0.3);
}

.upload-card:nth-child(2):hover .icon-wrapper {
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

/* Responsive */
@media (max-width: 768px) {
    .upload-page {
        padding: 24px 16px;
    }
    
 
    
    .upload-cards {
        grid-template-columns: 1fr;
        gap: 16px;
    }
    
    .card {
        min-height: 240px;
    }
    
    .card-content {
        min-height: 240px;
        padding: 32px 24px;
    }
    
    .icon-wrapper {
        width: 64px;
        height: 64px;
        margin-bottom: 20px;
    }
    
    .card-icon {
        font-size: 32px;
    }
    
    .card-title {
        font-size: 18px;
    }
    
    .card-desc {
        font-size: 13px;
    }
}

</style>
