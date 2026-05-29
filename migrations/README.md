To handle the `OperationalError` related to the missing `api_port` column in the `computer` table, follow these steps to create a new migration:

1. Ensure you have the necessary migration tools installed (e.g., Alembic).
2. Create a new migration file using the command:
   ```
   alembic revision -m "Add api_port column to computer table"
   ```
3. Open the newly created migration file in the `migrations/versions` directory.
4. In the `upgrade` function, add the following line to add the `api_port` column:
   ```python
   op.add_column('computer', sa.Column('api_port', sa.Integer(), nullable=True))
   ```
5. In the `downgrade` function, add the following line to remove the `api_port` column:
   ```python
   op.drop_column('computer', 'api_port')
   ```
6. Run the migration with the command:
   ```
   alembic upgrade head
   ```

Make sure to test your application after the migration to confirm that the `api_port` column has been successfully added.