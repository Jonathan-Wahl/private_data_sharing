class CreateSignalingMessages < ActiveRecord::Migration[7.2]
  def change
    create_table :signaling_messages do |t|
      t.references :signaling_room, null: false, foreign_key: true
      t.string :sender_id, null: false
      t.string :message_type, null: false
      t.json :body, null: false, default: {}
      t.datetime :expires_at, null: false

      t.timestamps
    end

    add_index :signaling_messages, :expires_at
  end
end
