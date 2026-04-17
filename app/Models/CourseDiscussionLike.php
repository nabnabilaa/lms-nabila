<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CourseDiscussionLike extends Model
{
    protected $fillable = ['user_id', 'course_discussion_id'];
}
