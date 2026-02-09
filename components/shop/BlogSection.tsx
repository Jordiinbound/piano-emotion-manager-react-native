/**
 * Sección de Blog para Shop
 * Piano Emotion Manager
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BlogPost } from '@/hooks/shop/use-shop';

// ============================================================================
// Types
// ============================================================================

interface BlogSectionProps {
  posts: BlogPost[];
  isLoading: boolean;
  onRefresh?: () => void;
}

// ============================================================================
// Blog Post Card
// ============================================================================

interface BlogPostCardProps {
  post: BlogPost;
  onPress: () => void;
}

const BlogPostCard: React.FC<BlogPostCardProps> = ({ post, onPress }) => {
  return (
    <TouchableOpacity style={styles.postCard} onPress={onPress} activeOpacity={0.7}>
      {/* Imagen destacada */}
      {post.imageUrl && (
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.postContent}>
        {/* Categorías */}
        {post.categories && post.categories.length > 0 && (
          <View style={styles.categoriesContainer}>
            {post.categories.slice(0, 2).map((category, index) => (
              <View key={index} style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{category}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Título */}
        <Text style={styles.postTitle} numberOfLines={2}>
          {post.title}
        </Text>

        {/* Excerpt */}
        {post.excerpt && (
          <Text style={styles.postExcerpt} numberOfLines={3}>
            {post.excerpt}
          </Text>
        )}

        {/* Footer con fecha y enlace */}
        <View style={styles.postFooter}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
            <Text style={styles.postDate}>{post.date}</Text>
          </View>
          <View style={styles.readMoreContainer}>
            <Text style={styles.readMoreText}>Leer más</Text>
            <Ionicons name="arrow-forward" size={14} color="#3b82f6" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ============================================================================
// Empty State
// ============================================================================

const EmptyState: React.FC = () => {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="newspaper-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>No hay artículos disponibles</Text>
      <Text style={styles.emptyText}>
        Los artículos del blog aparecerán aquí cuando estén disponibles.
      </Text>
    </View>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const BlogSection: React.FC<BlogSectionProps> = ({ posts, isLoading, onRefresh }) => {
  const handlePostPress = (post: BlogPost) => {
    if (post.url) {
      Linking.openURL(post.url);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Cargando artículos...</Text>
      </View>
    );
  }

  if (!posts || posts.length === 0) {
    return <EmptyState />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Blog</Text>
          <Text style={styles.headerSubtitle}>
            Artículos técnicos y novedades sobre pianos
          </Text>
        </View>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={20} color="#3b82f6" />
          </TouchableOpacity>
        )}
      </View>

      {/* Posts Grid */}
      <View style={styles.postsGrid}>
        {posts.map((post) => (
          <BlogPostCard
            key={post.id}
            post={post}
            onPress={() => handlePostPress(post)}
          />
        ))}
      </View>
    </ScrollView>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7280',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#eff6ff',
  },
  postsGrid: {
    gap: 16,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  postImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e5e7eb',
  },
  postContent: {
    padding: 16,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#dbeafe',
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 24,
    marginBottom: 8,
  },
  postExcerpt: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postDate: {
    fontSize: 13,
    color: '#9ca3af',
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
});
