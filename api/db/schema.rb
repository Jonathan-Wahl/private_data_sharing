# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2026_06_29_145721) do
  create_table "signaling_messages", force: :cascade do |t|
    t.integer "signaling_room_id", null: false
    t.string "sender_id", null: false
    t.string "message_type", null: false
    t.json "body", default: {}, null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["expires_at"], name: "index_signaling_messages_on_expires_at"
    t.index ["signaling_room_id"], name: "index_signaling_messages_on_signaling_room_id"
  end

  create_table "signaling_rooms", force: :cascade do |t|
    t.string "token", null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["expires_at"], name: "index_signaling_rooms_on_expires_at"
    t.index ["token"], name: "index_signaling_rooms_on_token", unique: true
  end

  add_foreign_key "signaling_messages", "signaling_rooms"
end
