<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class BlogPosts extends Model
{
    protected $table = 'blog_posts';

    protected $fillable = [
        'title',
        'url',
        'content',
        'meta_title',
        'meta_description',
        'keywords',
        'seo_image_data',
        'seo_image_type',
        'links',
        'is_published',
        'published_at'
    ];

    protected $hidden = [
        'seo_image_data', // Nicht in JSON responses anzeigen
        'seo_image_type'
    ];

    protected $appends = [
        'seo_image' // Virtuelles Attribut für Base64-URL
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'published_at' => 'datetime',
        'links' => 'array'
    ];

    public function getSeoImageAttribute()
    {
        if ($this->seo_image_data && $this->seo_image_type) {
            return 'data:' . $this->seo_image_type . ';base64,' . $this->seo_image_data;
        }
        return null;
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($post) {
            if (empty($post->url)) {
                $post->url = Str::slug($post->title);
            }

            if ($post->is_published && !$post->published_at) {
                $post->published_at = now();
            }
        });

        static::updating(function ($post) {
            if ($post->isDirty('is_published') && $post->is_published && !$post->published_at) {
                $post->published_at = now();
            }
        });
    }
}
