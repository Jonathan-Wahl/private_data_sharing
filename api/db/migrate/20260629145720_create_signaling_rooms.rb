class CreateSignalingRooms < ActiveRecord::Migration[7.2]
  def change
    create_table :signaling_rooms do |t|
      t.string :token, null: false
      t.datetime :expires_at, null: false

      t.timestamps
    end

    add_index :signaling_rooms, :token, unique: true
    add_index :signaling_rooms, :expires_at
  end
end
